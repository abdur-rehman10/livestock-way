import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import {
  fetchTripByLoadId,
  fetchOfferMessages,
  postOfferMessage,
  type OfferMessage,
  type TripEnvelope,
} from "../api/marketplace";
import { ArrowLeft, Send, Lock, MessageSquare, Loader2, Truck, Package, Circle } from "lucide-react";

const TripChat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const loadId = id ? Number(id) : NaN;
  const isHauler = location.pathname.startsWith("/hauler");
  const senderRole: "hauler" | "shipper" = isHauler ? "hauler" : "shipper";
  const basePath = isHauler ? "/hauler" : "/shipper";

  const [context, setContext] = useState<TripEnvelope | null>(null);
  const [contextLoading, setContextLoading] = useState(true);
  const [contextError, setContextError] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [messages, setMessages] = useState<OfferMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadOfferMessages = useCallback(async (targetOfferId: string) => {
    try {
      setMessagesLoading(true);
      setMessagesError(null);
      const data = await fetchOfferMessages(targetOfferId);
      setMessages(data.items ?? []);
    } catch (err: any) {
      console.error("Error loading offer messages", err);
      setMessages([]);
      setMessagesError(err?.message || "Failed to load chat history.");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadId || Number.isNaN(loadId)) {
      setContextError("Invalid trip id.");
      setContextLoading(false);
      return;
    }

    async function loadContext() {
      try {
        setContextLoading(true);
        setContextError(null);
        const data = await fetchTripByLoadId(loadId);
        setContext(data);
        const awardedOfferId = data?.load?.awarded_offer_id ?? null;
        if (!awardedOfferId) {
          setOfferId(null);
          setMessages([]);
          setMessagesError("Chat will unlock once this load has an accepted offer.");
        } else {
          setOfferId(String(awardedOfferId));
          loadOfferMessages(String(awardedOfferId));
        }
      } catch (err: any) {
        console.error("Error fetching trip context", err);
        setContextError(err?.message || "Failed to load trip context.");
      } finally {
        setContextLoading(false);
      }
    }

    loadContext();
  }, [loadId, loadOfferMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerId) {
      setSendError("Chat is only available after the booking is accepted.");
      return;
    }

    const trimmed = newMessage.trim();
    if (!trimmed) {
      return;
    }

    try {
      setSending(true);
      setSendError(null);
      const response = await postOfferMessage(offerId, { text: trimmed });
      setMessages((prev) => [...prev, response.message]);
      setNewMessage("");
      messageInputRef.current?.focus();
    } catch (err: any) {
      console.error("Error sending message", err);
      setSendError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleBack = () => {
    if (!Number.isNaN(loadId)) {
      navigate(`${basePath}/trips/`);
    } else {
      navigate(basePath === "/hauler" ? "/hauler/my-loads" : "/shipper/my-loads");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getRoleIcon = (role: string, isMine: boolean) => {
    if (role.toLowerCase().includes('hauler')) {
      return <Truck className="w-4 h-4 text-white" />;
    }
    return <Package className="w-4 h-4 text-white" />;
  };

  const getAvatarColor = (role: string) => {
    if (role.toLowerCase().includes('hauler')) {
      return "bg-primary";
    }
    return "bg-primary";
  };

  const EmptyState = ({ icon: Icon, title, description, action }: any) => (
    <div className="flex h-full items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
        </div>
        {action}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen max-h-screen w-full bg-slate-50 overflow-hidden">
      {/* Header - Fixed */}
      <div className="flex-none border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <button
            onClick={handleBack}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`flex-none flex items-center justify-center w-11 h-11 rounded-full bg-primary shadow-md ${
              senderRole === "hauler" 
                ? "from-blue-400 to-blue-600" 
                : "from-orange-400 to-orange-600"
            }`}>
              {senderRole === "hauler" ? (
                <Package className="w-8 h-8 text-white" />
              ) : (
                <Truck className="w-8 h-8 text-white" />
              )}
            </div>
            
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-base font-semibold text-slate-900 truncate">
                {senderRole === "hauler" ? "Shipper" : "Hauler"}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 truncate">
                  Trip #{context?.trip?.id ?? "—"}
                </p>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                  <span className="text-xs text-green-600 font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain min-h-0"
        style={{ maxHeight: 'calc(100vh - 140px)' }}
      >
        {contextLoading ? (
          <EmptyState 
            icon={Loader2}
            title="Loading..."
            description="Fetching trip details"
            action={null}
          />
        ) : contextError ? (
          <EmptyState 
            icon={Lock}
            title="Error"
            description={contextError}
            action={null}
          />
        ) : messagesLoading ? (
          <EmptyState 
            icon={Loader2}
            title="Loading messages..."
            description="Please wait"
            action={null}
          />
        ) : messagesError ? (
          <EmptyState 
            icon={Lock}
            title="Chat Locked"
            description={messagesError}
            action={null}
          />
        ) : !offerId ? (
          <EmptyState 
            icon={Lock}
            title="Chat Unavailable"
            description="Chat becomes available once this load has an accepted booking."
            action={null}
          />
        ) : messages.length === 0 ? (
          <EmptyState 
            icon={MessageSquare}
            title="No messages yet"
            description="Start the conversation below"
            action={null}
          />
        ) : (
          <div className="p-4 space-y-3">
            {messages.map((msg, index) => {
              const normalizedRole = (msg.sender_role || "").toLowerCase();
              const isMine = normalizedRole.startsWith(senderRole);
              const showTime = index === 0 || 
                new Date(messages[index - 1]?.created_at).getTime() < new Date(msg.created_at).getTime() - 300000;
              
              return (
                <div key={msg.id} className="space-y-2">
                  {showTime && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-slate-500 px-3 py-1 rounded-full bg-white shadow-sm font-medium">
                        {formatTime(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"}`}>
                    {!isMine && (
                      <div className={`flex-none w-8 h-8 rounded-full bg-gradient-to-br shadow-md flex items-center justify-center ${getAvatarColor(normalizedRole)}`}>
                        {getRoleIcon(normalizedRole, isMine)}
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[75%] sm:max-w-md px-4 py-2.5 rounded-2xl shadow-sm ${
                        isMine
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-white text-slate-900 border border-slate-200 rounded-bl-md"
                      }`}
                    >
                      <p className="text-[15px] leading-relaxed break-words">
                        {msg.text || <span className="italic opacity-60">[no text]</span>}
                      </p>
                    </div>

                    {isMine && (
                      <div className={`flex-none w-8 h-8 rounded-full bg-gradient-to-br shadow-md flex items-center justify-center ${getAvatarColor(senderRole)}`}>
                        {getRoleIcon(senderRole, isMine)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area - Fixed */}
      <div className="flex-none border-t border-slate-200 bg-white shadow-lg">
        <div className="p-4">
          {sendError && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{sendError}</p>
            </div>
          )}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              ref={messageInputRef}
              disabled={!offerId}
              className="flex-1 px-4 py-3 text-[15px] rounded-full border-2 border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50 transition-all"
              placeholder={offerId ? "Type a message..." : "Chat unavailable"}
            />
            <button
              type="submit"
              disabled={sending || !offerId || !newMessage.trim()}
              className="flex-none w-12 h-12 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-md hover:shadow-lg"
              aria-label="Send message"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TripChat;