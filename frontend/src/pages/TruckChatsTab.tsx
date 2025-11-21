import { useEffect, useState, useCallback } from "react";
import {
  fetchTruckChats,
  fetchTruckChatMessages,
  sendTruckChatMessage,
  type TruckChatSummary,
  type TruckChatMessage,
} from "../api/marketplace";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { SOCKET_EVENTS, subscribeToSocketEvent } from "../lib/socket";
import { toast } from "sonner";

export default function TruckChatsTab() {
  const [chats, setChats] = useState<TruckChatSummary[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<TruckChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const userRole = storage.get<string | null>(STORAGE_KEYS.USER_ROLE, null);

  const refreshChats = useCallback(async () => {
    try {
      setLoadingChats(true);
      const resp = await fetchTruckChats();
      setChats(resp.items);
      if (!selectedChatId && resp.items.length > 0) {
        setSelectedChatId(resp.items[0].chat.id);
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load truck chats");
    } finally {
      setLoadingChats(false);
    }
  }, [selectedChatId]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([]);
      return;
    }
    (async () => {
      try {
        setLoadingMessages(true);
        const resp = await fetchTruckChatMessages(selectedChatId);
        setMessages(resp.items);
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to load conversation");
      } finally {
        setLoadingMessages(false);
      }
    })();
  }, [selectedChatId]);

  useEffect(() => {
    const unsubscribe = subscribeToSocketEvent(
      SOCKET_EVENTS.TRUCK_CHAT_MESSAGE,
      ({ message }) => {
        if (!message) return;
        const typed = message as TruckChatMessage;
        if (selectedChatId && String(typed.chat_id) === selectedChatId) {
          setMessages((prev) => [...prev, typed]);
        }
        refreshChats();
      }
    );
    return () => {
      unsubscribe();
    };
  }, [selectedChatId, refreshChats]);

  const handleSend = async () => {
    if (!selectedChatId || !draft.trim()) return;
    try {
      const resp = await sendTruckChatMessage(selectedChatId, { message: draft.trim() });
      setMessages((prev) => [...prev, resp.message]);
      setDraft("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to send message");
    }
  };

  const selectedChat = chats.find((item) => item.chat.id === selectedChatId);

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Truck Chats {userRole ? `(${userRole})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="border rounded-xl overflow-hidden">
            <ScrollArea className="h-[480px]">
              {loadingChats ? (
                <p className="p-4 text-sm text-gray-500">Loading chats…</p>
              ) : chats.length === 0 ? (
                <p className="p-4 text-sm text-gray-500">No truck chats yet.</p>
              ) : (
                chats.map((entry) => {
                  const isActive = entry.chat.id === selectedChatId;
                  return (
                    <button
                      key={entry.chat.id}
                      onClick={() => setSelectedChatId(entry.chat.id)}
                      className={`w-full border-b px-4 py-3 text-left ${
                        isActive ? "bg-gray-100" : "hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900">
                          {entry.availability.origin_location_text}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {entry.last_message
                            ? new Date(entry.last_message.created_at).toLocaleDateString()
                            : "New"}
                        </Badge>
                      </div>
                      {entry.availability.destination_location_text && (
                        <p className="text-xs text-gray-500">
                          → {entry.availability.destination_location_text}
                        </p>
                      )}
                      {entry.last_message?.message && (
                        <p className="text-xs text-gray-600 line-clamp-2 mt-1">
                          {entry.last_message.message}
                        </p>
                      )}
                    </button>
                  );
                })
              )}
            </ScrollArea>
          </div>

          <div className="border rounded-xl p-4 flex flex-col gap-3 h-[520px]">
            {!selectedChat ? (
              <p className="text-sm text-gray-500">Select a chat to view messages.</p>
            ) : (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {selectedChat.availability.origin_location_text}
                  </p>
                  {selectedChat.availability.destination_location_text && (
                    <p className="text-xs text-gray-500">
                      → {selectedChat.availability.destination_location_text}
                    </p>
                  )}
                </div>
                <ScrollArea className="flex-1 rounded border">
                  {loadingMessages ? (
                    <p className="p-4 text-sm text-gray-500">Loading messages…</p>
                  ) : messages.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">No messages yet.</p>
                  ) : (
                    <div className="space-y-3 p-4">
                      {messages.map((msg) => (
                        <div key={msg.id} className="rounded border p-2 text-sm">
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{msg.sender_role}</span>
                            <span>{new Date(msg.created_at).toLocaleString()}</span>
                          </div>
                          {msg.message && <p className="mt-2">{msg.message}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="flex-1"
                    disabled={!selectedChatId}
                  />
                  <Button onClick={handleSend} disabled={!selectedChatId || !draft.trim()}>
                    Send
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
