import React, { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { fetchTripMessages, createTripMessage } from "../lib/api";
import type { TripMessage } from "../lib/types";

const TripChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const loadId = id ? Number(id) : NaN;
  const isHauler = location.pathname.startsWith("/hauler");
  const senderRole: "hauler" | "shipper" = isHauler ? "hauler" : "shipper";
  const basePath = isHauler ? "/hauler" : "/shipper";

  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loadId || Number.isNaN(loadId)) {
      setError("Invalid trip id");
      setLoading(false);
      return;
    }

    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTripMessages(loadId);
        setMessages(data);
      } catch (err: any) {
        console.error("Error loading chat messages", err);
        setError(err?.message || "Failed to load chat messages.");
      } finally {
        setLoading(false);
      }
    }

    loadMessages();
  }, [loadId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loadId || Number.isNaN(loadId)) return;

    const trimmed = newMessage.trim();
    if (!trimmed) {
      setSendError("Please type a message.");
      return;
    }

    try {
      setSending(true);
      setSendError(null);
      const created = await createTripMessage(loadId, {
        sender: senderRole,
        message: trimmed,
      });
      setMessages((prev) => [...prev, created]);
      setNewMessage("");
    } catch (err: any) {
      console.error("Error sending message", err);
      setSendError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    if (!Number.isNaN(loadId)) {
      navigate(`${basePath}/trips/${loadId}`);
    } else {
      navigate(basePath === "/hauler" ? "/hauler/my-loads" : "/shipper/my-loads");
    }
  };

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-50">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2">
        <button
          onClick={handleBack}
          className="text-xs text-slate-500 hover:text-slate-900"
        >
          ← Back to trip
        </button>
        <div className="flex flex-col items-center">
          <h1 className="text-sm font-semibold text-slate-900">
            {senderRole === "hauler" ? "Chat with shipper" : "Chat with hauler"}
          </h1>
          <p className="text-[11px] text-slate-500">Trip ID: {Number.isNaN(loadId) ? "-" : loadId}</p>
        </div>
        <div className="text-[10px] text-slate-400">
          You are: <span className="font-semibold">{senderRole}</span>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="text-[11px] text-slate-500">Loading messages…</div>
        ) : error ? (
          <div className="text-[11px] text-red-600">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-[11px] text-slate-500 space-y-2">
            <p>No messages yet. Start the conversation.</p>
            <button
              type="button"
              className="rounded-md border border-emerald-200 px-3 py-1.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
              onClick={() => messageInputRef.current?.focus()}
            >
              Start chatting
            </button>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender === senderRole;
            return (
              <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-[11px] ${
                    isMine
                      ? "bg-[#29CA8D] text-white"
                      : "bg-white text-slate-900 border border-slate-200"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-medium opacity-75">
                    {msg.sender === "hauler" ? "Hauler" : "Shipper"}
                  </div>
                  <div>{msg.message}</div>
                  <div className="mt-1 text-[9px] opacity-75">
                    {new Date(msg.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="border-t border-slate-200 bg-white px-3 py-2">
        {sendError && (
          <div className="mb-1 text-[11px] text-red-600">{sendError}</div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            ref={messageInputRef}
            className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Type a message…"
          />
          <button
            type="submit"
            disabled={sending || !id}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TripChat;
