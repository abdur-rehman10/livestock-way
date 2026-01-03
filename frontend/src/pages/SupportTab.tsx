import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  fetchSupportTicketsForUser,
  createSupportTicket,
  fetchSupportTicketMessagesForUser,
  postSupportTicketMessageForUser,
} from "../lib/api";
import type { SupportTicket, SupportTicketMessage } from "../lib/types";
import { Button } from "../components/ui/button";
import { storage, STORAGE_KEYS } from "../lib/storage";

type UserRole = "shipper" | "hauler" | "driver" | "stakeholder";

function detectRoleFromPath(pathname: string): UserRole {
  if (pathname.startsWith("/hauler")) return "hauler";
  if (pathname.startsWith("/shipper")) return "shipper";
  if (pathname.startsWith("/driver")) return "driver";
  return "stakeholder";
}

const PRIORITY_OPTIONS: Array<"low" | "normal" | "high" | "urgent"> = [
  "low",
  "normal",
  "high",
  "urgent",
];

const ROLE_BUTTON_CLASSES: Record<UserRole, string> = {
  hauler: "bg-[#29CA8D] hover:bg-[#24b67d] text-white",
  shipper: "bg-[#F97316] hover:bg-[#ea580c] text-white",
  driver: "bg-[#0ea5e9] hover:bg-[#0284c7] text-white",
  stakeholder: "bg-[#475569] hover:bg-[#334155] text-white",
};

export default function SupportTab() {
  const location = useLocation();
  const role = useMemo(
    () => detectRoleFromPath(location.pathname),
    [location.pathname]
  );
  const storedUserId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const userId = storedUserId;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
  const [ticketMessages, setTicketMessages] = useState<SupportTicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] =
    useState<"low" | "normal" | "high" | "urgent">("normal");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const submitButtonClass = ROLE_BUTTON_CLASSES[role] ?? "bg-gray-900 text-white hover:bg-gray-800";

  useEffect(() => {
    async function load() {
      if (!userId) {
        setError("Please log in to submit support tickets.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const data = await fetchSupportTicketsForUser(userId, role);
        setTickets(data);
      } catch (err: any) {
        console.error("Error loading tickets", err);
        setError(err?.message || "Failed to load support tickets.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, role]);

  const loadTicketMessages = useCallback(
    async (ticketId: number) => {
      if (!userId) return;
      setMessagesLoading(true);
      setMessageError(null);
      try {
        const items = await fetchSupportTicketMessagesForUser(ticketId, userId, role);
        setTicketMessages(items);
      } catch (err: any) {
        setMessageError(err?.message || "Failed to load messages.");
        setTicketMessages([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [role, userId]
  );

  const handleToggleConversation = async (ticketId: number) => {
    if (activeTicketId === ticketId) {
      setActiveTicketId(null);
      setTicketMessages([]);
      setMessageDraft("");
      setMessageError(null);
      return;
    }
    setActiveTicketId(ticketId);
    setMessageDraft("");
    await loadTicketMessages(ticketId);
  };

  const handleSendMessage = useCallback(async () => {
    if (!activeTicketId || !userId || !messageDraft.trim()) {
      setMessageError("Please enter a message.");
      return;
    }
    try {
      setSendingMessage(true);
      setMessageError(null);
      await postSupportTicketMessageForUser(activeTicketId, {
        user_id: userId,
        role,
        message: messageDraft.trim(),
      });
      setMessageDraft("");
      await loadTicketMessages(activeTicketId);
    } catch (err: any) {
      setMessageError(err?.message || "Failed to send message.");
    } finally {
      setSendingMessage(false);
    }
  }, [activeTicketId, loadTicketMessages, messageDraft, role, userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setSubmitError("Please fill subject and message.");
      return;
    }

    if (!userId) {
      setSubmitError("You must be logged in to submit a ticket.");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const newTicket = await createSupportTicket({
        user_id: userId,
        role,
        subject: subject.trim(),
        message: message.trim(),
        priority,
      });

      setTickets((prev) => [newTicket, ...prev]);
      setActiveTicketId(newTicket.id);
      setTicketMessages([]);
      setMessageDraft("");
      setSubject("");
      setMessage("");
      setPriority("normal");
    } catch (err: any) {
      console.error("Error creating support ticket", err);
      setSubmitError(
        err?.message || "Failed to submit support ticket. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-xs text-gray-600">Loading support…</div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-xs text-red-600">{error}</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 text-xs"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">
          Support & Help Center
        </h1>
        <p className="text-[11px] text-gray-500">
          Role: <span className="font-medium capitalize">{role}</span> · User ID:{" "}
          <span className="font-mono text-gray-700">{userId ?? "n/a"}</span>
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">
          Submit a new ticket
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="E.g. Issue with posting loads"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Describe the problem, steps to reproduce, any screenshots or trip IDs."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-gray-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "low" | "normal" | "high" | "urgent")
              }
              className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {PRIORITY_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {submitError && (
            <div className="text-[11px] text-red-600">{submitError}</div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className={`px-4 py-1.5 text-xs font-medium disabled:opacity-60 ${submitButtonClass}`}
            >
              {submitting ? "Sending…" : "Submit ticket"}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-2 text-[11px] font-semibold text-gray-600">
          Your tickets
        </div>

        {tickets.length === 0 ? (
          <div className="p-4 text-[11px] text-gray-500">
            You have not submitted any support tickets yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((t) => (
              <div key={t.id} className="px-4 py-3 text-[11px] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {t.subject}
                    </div>
                    <div className="mt-1 text-gray-700 whitespace-pre-line">
                      {t.message}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        t.status === "open"
                          ? "bg-orange-50 text-orange-700 border border-orange-200"
                          : t.status === "resolved"
                          ? "bg-primary-50 text-emerald-700 border border-emerald-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {t.status}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        t.priority === "high" || t.priority === "urgent"
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                      }`}
                    >
                      {t.priority}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 flex items-center justify-between">
                  <span>Created: {new Date(t.created_at).toLocaleString()}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleConversation(t.id)}
                  >
                    {activeTicketId === t.id ? "Hide conversation" : "View conversation"}
                  </Button>
                </div>
                {activeTicketId === t.id && (
                  <div className="mt-2 space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                    {messageError && (
                      <div className="text-[10px] text-red-600">{messageError}</div>
                    )}
                    <div className="h-44 overflow-y-auto space-y-2">
                      {messagesLoading ? (
                        <p className="text-[10px] text-gray-500">Loading conversation…</p>
                      ) : ticketMessages.length === 0 ? (
                        <p className="text-[10px] text-gray-500">
                          No replies yet. Share additional details below.
                        </p>
                      ) : (
                        ticketMessages.map((msg) => {
                          const isUser = msg.sender_user_id === userId;
                          return (
                            <div
                              key={msg.id}
                              className={`rounded-lg px-3 py-2 text-[10px] ${
                                isUser
                                  ? "bg-[#29CA8D] text-white"
                                  : "bg-gray-100 text-gray-700 border border-gray-200"
                              }`}
                            >
                              <div className="flex items-center justify-between opacity-75">
                                <span>{msg.sender_role || (isUser ? role : "support")}</span>
                                <span>{new Date(msg.created_at).toLocaleString()}</span>
                              </div>
                              <p className="mt-1">{msg.message}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-gray-600">
                        Reply to support
                      </label>
                      <textarea
                        rows={3}
                        value={messageDraft}
                        onChange={(e) => setMessageDraft(e.target.value)}
                        className="block w-full rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="Type your reply…"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        className={submitButtonClass}
                        onClick={handleSendMessage}
                        disabled={sendingMessage || !messageDraft.trim()}
                      >
                        {sendingMessage ? "Sending…" : "Send reply"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400">
        Phase 1 note: Tickets are visible to the Livestock Way support team in
        the Super Admin console. In later phases they can be escalated,
        assigned, and resolved with full audit trails.
      </p>
    </div>
  );
}
