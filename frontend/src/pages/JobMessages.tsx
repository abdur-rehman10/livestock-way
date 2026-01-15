import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Send, MessageSquare, Briefcase, User, Clock, MapPin, DollarSign, Calendar, Building, Eye, Phone, Mail, X, FileText } from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { fetchUserThreads, fetchThreadMessages, sendMessage, fetchThreadById, type JobApplicationThread, type JobApplicationMessage } from "../api/jobMessages";
import { fetchUserBuySellThreads, fetchBuySellThreadMessages, sendBuySellMessage, fetchBuySellThreadById, type BuySellApplicationThread, type BuySellApplicationMessage } from "../api/buySellMessages";
import { fetchUserResourcesThreads, fetchResourcesThreadMessages, sendResourcesMessage, fetchResourcesThreadById, type ResourcesApplicationThread, type ResourcesApplicationMessage } from "../api/resourcesMessages";
import { fetchJobById, type JobListing } from "../api/jobs";
import { fetchJobApplications } from "../api/jobs";
import { fetchBuyAndSellById, type BuyAndSellListing } from "../api/buyAndSell";
import { fetchBuyAndSellApplications } from "../api/buyAndSell";
import { fetchResourcesById, type ResourcesListing } from "../api/resources";
import { fetchResourcesApplications } from "../api/resources";
import { toast } from "sonner";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { API_BASE_URL } from "../lib/api";
import { getSocket, subscribeToSocketEvent, joinSocketRoom, SOCKET_EVENTS } from "../lib/socket";

type ThreadType = "job" | "buy-sell" | "resources";
type UnifiedThread = (JobApplicationThread & { type: "job" }) | (BuySellApplicationThread & { type: "buy-sell" }) | (ResourcesApplicationThread & { type: "resources" });
type UnifiedMessage = (JobApplicationMessage & { type: "job" }) | (BuySellApplicationMessage & { type: "buy-sell" }) | (ResourcesApplicationMessage & { type: "resources" });

export default function JobMessages() {
  const [jobThreads, setJobThreads] = useState<JobApplicationThread[]>([]);
  const [buySellThreads, setBuySellThreads] = useState<BuySellApplicationThread[]>([]);
  const [resourcesThreads, setResourcesThreads] = useState<ResourcesApplicationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<UnifiedThread | null>(null);
  const [messages, setMessages] = useState<UnifiedMessage[]>([]);
  const [jobDetails, setJobDetails] = useState<JobListing | null>(null);
  const [buySellDetails, setBuySellDetails] = useState<BuyAndSellListing | null>(null);
  const [resourcesDetails, setResourcesDetails] = useState<ResourcesListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showChat, setShowChat] = useState(false); // For mobile responsiveness
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [applicantInfo, setApplicantInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const userId = storage.get<string | null>(STORAGE_KEYS.USER_ID, null);
  const socketRef = useRef<ReturnType<typeof getSocket> | null>(null);
  const currentThreadRoomRef = useRef<string | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      setLoading(true);
      const [jobResult, buySellResult, resourcesResult] = await Promise.all([
        fetchUserThreads().catch(() => []),
        fetchUserBuySellThreads().catch(() => []),
        fetchUserResourcesThreads().catch(() => []),
      ]);
      setJobThreads(jobResult);
      setBuySellThreads(buySellResult);
      setResourcesThreads(resourcesResult);
      // Don't auto-select first thread - let user choose or open via custom event
    } catch (err: any) {
      console.error("Error loading threads:", err);
      toast.error(err?.message ?? "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  const allThreads: UnifiedThread[] = [
    ...jobThreads.map(t => ({ ...t, type: "job" as const })),
    ...buySellThreads.map(t => ({ ...t, type: "buy-sell" as const })),
    ...resourcesThreads.map(t => ({ ...t, type: "resources" as const })),
  ].sort((a, b) => {
    const aTime = a.last_message_at || a.updated_at;
    const bTime = b.last_message_at || b.updated_at;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  const loadMessages = useCallback(async (thread: UnifiedThread) => {
    try {
      setMessagesLoading(true);
      if (thread.type === "job") {
        const result = await fetchThreadMessages(thread.id);
        setMessages(result.map(m => ({ ...m, type: "job" as const })));
        await loadJobDetails(thread.job_id);
      } else if (thread.type === "buy-sell") {
        const result = await fetchBuySellThreadMessages(thread.id);
        setMessages(result.map(m => ({ ...m, type: "buy-sell" as const })));
        await loadBuySellDetails(thread.listing_id);
      } else {
        const result = await fetchResourcesThreadMessages(thread.id);
        setMessages(result.map(m => ({ ...m, type: "resources" as const })));
        await loadResourcesDetails(thread.listing_id);
      }
    } catch (err: any) {
      console.error("Error loading messages:", err);
      toast.error(err?.message ?? "Failed to load messages");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadBuySellDetails = useCallback(async (listingId: number) => {
    try {
      const listing = await fetchBuyAndSellById(listingId);
      setBuySellDetails(listing);
    } catch (err: any) {
      console.error("Error loading listing details:", err);
    }
  }, []);

  const loadResourcesDetails = useCallback(async (listingId: number) => {
    try {
      const listing = await fetchResourcesById(listingId);
      setResourcesDetails(listing);
    } catch (err: any) {
      console.error("Error loading resource details:", err);
    }
  }, []);

  const loadJobDetails = useCallback(async (jobId: number) => {
    try {
      const job = await fetchJobById(jobId);
      setJobDetails(job);
    } catch (err: any) {
      console.error("Error loading job details:", err);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Initialize socket connection and set up listeners
  useEffect(() => {
    if (!userId) return;

    const socket = getSocket();
    socketRef.current = socket;

    // Join thread room when a thread is selected
    if (selectedThread) {
      const threadRoom = selectedThread.type === "job" 
        ? `job-thread-${selectedThread.id}`
        : selectedThread.type === "buy-sell"
          ? `buy-sell-thread-${selectedThread.id}`
          : `resources-thread-${selectedThread.id}`;
      if (currentThreadRoomRef.current !== threadRoom) {
        // Leave previous room if any
        if (currentThreadRoomRef.current) {
          socket.emit("leave", currentThreadRoomRef.current);
        }
        // Join new thread room
        joinSocketRoom(threadRoom);
        currentThreadRoomRef.current = threadRoom;
      }
    } else {
      // Leave room if no thread is selected
      if (currentThreadRoomRef.current) {
        socket.emit("leave", currentThreadRoomRef.current);
        currentThreadRoomRef.current = null;
      }
    }

    // Subscribe to job message events
    const unsubscribeJobMessage = subscribeToSocketEvent(
      SOCKET_EVENTS.JOB_MESSAGE,
      (payload) => {
        const { message, thread } = payload;
        
        // Only add message if it's for the currently selected thread
        if (selectedThread && selectedThread.type === "job" && thread.id === selectedThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "job")) {
              return prev;
            }
            return [...prev, { ...message, type: "job" as const }];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
        
        // Update thread in list
        setJobThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: message.message,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "job" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    // Subscribe to buy-sell message events
    const unsubscribeBuySellMessage = subscribeToSocketEvent(
      "buy-sell:message" as any,
      (payload: any) => {
        const { message, thread } = payload;
        
        if (selectedThread && selectedThread.type === "buy-sell" && thread.id === selectedThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "buy-sell")) {
              return prev;
            }
            return [...prev, { ...message, type: "buy-sell" as const }];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
        
        setBuySellThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: message.message,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "buy-sell" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    // Subscribe to resources message events
    const unsubscribeResourcesMessage = subscribeToSocketEvent(
      "resources:message" as any,
      (payload: any) => {
        const { message, thread } = payload;
        
        if (selectedThread && selectedThread.type === "resources" && thread.id === selectedThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id && m.type === "resources")) {
              return prev;
            }
            return [...prev, { ...message, type: "resources" as const }];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
        
        setResourcesThreads((prev) =>
          prev.map((t) =>
            t.id === thread.id
              ? {
                  ...t,
                  last_message: message.message,
                  last_message_at: message.created_at,
                  first_message_sent: true,
                  unread_count: 
                    Number(message.sender_user_id) !== Number(userId) && 
                    (!selectedThread || selectedThread.type !== "resources" || selectedThread.id !== thread.id)
                      ? (t.unread_count || 0) + 1 
                      : t.unread_count,
                }
              : t
          )
        );
      }
    );

    // Subscribe to thread list updates
    const unsubscribeJobThreadUpdate = subscribeToSocketEvent(
      SOCKET_EVENTS.JOB_THREAD_UPDATED,
      (payload) => {
        const { threads } = payload;
        setJobThreads(threads);
        
        if (selectedThread && selectedThread.type === "job") {
          const updatedThread = threads.find((t) => t.id === selectedThread.id);
          if (updatedThread) {
            setSelectedThread((prev) => {
              if (prev && prev.type === "job" && prev.id === updatedThread.id) {
                return { ...prev, ...updatedThread };
              }
              return prev;
            });
          }
        }
      }
    );

    const unsubscribeBuySellThreadUpdate = subscribeToSocketEvent(
      "buy-sell:thread:updated" as any,
      (payload: any) => {
        const { threads } = payload;
        setBuySellThreads(threads);
        
        if (selectedThread && selectedThread.type === "buy-sell") {
          const updatedThread = threads.find((t: BuySellApplicationThread) => t.id === selectedThread.id);
          if (updatedThread) {
            setSelectedThread((prev) => {
              if (prev && prev.type === "buy-sell" && prev.id === updatedThread.id) {
                return { ...prev, ...updatedThread };
              }
              return prev;
            });
          }
        }
      }
    );

    return () => {
      unsubscribeJobMessage();
      unsubscribeBuySellMessage();
      unsubscribeJobThreadUpdate();
      unsubscribeBuySellThreadUpdate();
      // Leave thread room on cleanup
      if (currentThreadRoomRef.current && socket) {
        socket.emit("leave", currentThreadRoomRef.current);
        currentThreadRoomRef.current = null;
      }
    };
  }, [userId, selectedThread]);

  const loadApplicantInfo = useCallback(async () => {
    if (!selectedThread || selectedThread.type !== "job") return;
    try {
      const result = await fetchJobApplications(selectedThread.job_id);
      const application = result.items.find((app) => app.id === selectedThread.application_id);
      if (application) {
        setApplicantInfo({
          name: application.applicant_name,
          email: application.applicant_email,
          phone: application.applicant_phone,
          cover_letter: application.cover_letter,
          resume_url: application.resume_url,
          status: application.status,
          applied_at: application.created_at,
        });
      }
    } catch (err: any) {
      console.error("Error loading applicant info:", err);
    }
  }, [selectedThread]);

  const loadBuySellApplicantInfo = useCallback(async () => {
    if (!selectedThread || selectedThread.type !== "buy-sell") return;
    try {
      const result = await fetchBuyAndSellApplications(selectedThread.listing_id);
      const application = result.items.find((app) => app.id === selectedThread.application_id);
      if (application) {
        setApplicantInfo({
          name: application.applicant_name,
          email: application.applicant_email,
          phone: application.applicant_phone,
          message: application.message,
          offered_price: application.offered_price,
          status: application.status,
          applied_at: application.created_at,
        });
      }
    } catch (err: any) {
      console.error("Error loading applicant info:", err);
    }
  }, [selectedThread]);

  const loadResourcesApplicantInfo = useCallback(async () => {
    if (!selectedThread || selectedThread.type !== "resources") return;
    try {
      const result = await fetchResourcesApplications(selectedThread.listing_id);
      const application = result.items.find((app) => app.id === selectedThread.application_id);
      if (application) {
        setApplicantInfo({
          name: application.applicant_name,
          email: application.applicant_email,
          phone: application.applicant_phone,
          message: application.message,
          status: application.status,
          applied_at: application.created_at,
        });
      }
    } catch (err: any) {
      console.error("Error loading applicant info:", err);
    }
  }, [selectedThread]);

  const previousThreadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedThread) {
      const threadId = selectedThread.id;
      const threadType = selectedThread.type;
      const isNewThread = previousThreadIdRef.current !== `${threadType}-${threadId}`;
      
      // Only reload messages if this is a different thread
      if (isNewThread) {
        previousThreadIdRef.current = `${threadType}-${threadId}`;
        loadMessages(selectedThread);
        
        // Load applicant info if user is poster
        if (threadType === "job") {
          if (Number(selectedThread.job_poster_user_id) === Number(userId)) {
            loadApplicantInfo();
          } else {
            setApplicantInfo(null);
          }
        } else if (threadType === "buy-sell") {
          if (Number(selectedThread.listing_poster_user_id) === Number(userId)) {
            loadBuySellApplicantInfo();
          } else {
            setApplicantInfo(null);
          }
        } else {
          if (Number(selectedThread.listing_poster_user_id) === Number(userId)) {
            loadResourcesApplicantInfo();
          } else {
            setApplicantInfo(null);
          }
        }
        
        // Reload threads after a short delay to update unread counts
        const timer = setTimeout(() => {
          loadThreads();
        }, 1000);
        
        return () => clearTimeout(timer);
      }
      
      setShowChat(true); // Show chat on mobile when thread is selected
      
      // Reset unread count for this thread when viewing
      if (threadType === "job") {
        setJobThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      } else if (threadType === "buy-sell") {
        setBuySellThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      } else {
        setResourcesThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, unread_count: 0 } : t
          )
        );
      }
    } else {
      previousThreadIdRef.current = null;
    }
  }, [selectedThread, loadMessages, loadJobDetails, loadBuySellDetails, loadResourcesDetails, loadApplicantInfo, loadBuySellApplicantInfo, loadResourcesApplicantInfo, userId, loadThreads]);

  // Listen for custom events to open specific threads
  useEffect(() => {
    const handleOpenJobThread = async (event: CustomEvent) => {
      const threadId = (event.detail as { threadId: number }).threadId;
      try {
        const thread = await fetchThreadById(threadId);
        setSelectedThread({ ...thread, type: "job" });
        setShowChat(true);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    const handleOpenBuySellThread = async (event: CustomEvent) => {
      const threadId = (event.detail as { threadId: number }).threadId;
      try {
        const thread = await fetchBuySellThreadById(threadId);
        setSelectedThread({ ...thread, type: "buy-sell" });
        setShowChat(true);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    const handleOpenResourcesThread = async (event: CustomEvent) => {
      const threadId = (event.detail as { threadId: number }).threadId;
      try {
        const thread = await fetchResourcesThreadById(threadId);
        setSelectedThread({ ...thread, type: "resources" });
        setShowChat(true);
        const [updatedJobThreads, updatedBuySellThreads, updatedResourcesThreads] = await Promise.all([
          fetchUserThreads().catch(() => []),
          fetchUserBuySellThreads().catch(() => []),
          fetchUserResourcesThreads().catch(() => []),
        ]);
        setJobThreads(updatedJobThreads);
        setBuySellThreads(updatedBuySellThreads);
        setResourcesThreads(updatedResourcesThreads);
      } catch (err) {
        console.error("Error loading thread:", err);
        toast.error("Failed to load thread");
      }
    };

    window.addEventListener("open-job-thread", handleOpenJobThread as unknown as EventListener);
    window.addEventListener("open-buy-sell-thread", handleOpenBuySellThread as unknown as EventListener);
    window.addEventListener("open-resources-thread", handleOpenResourcesThread as unknown as EventListener);
    return () => {
      window.removeEventListener("open-job-thread", handleOpenJobThread as unknown as EventListener);
      window.removeEventListener("open-buy-sell-thread", handleOpenBuySellThread as unknown as EventListener);
      window.removeEventListener("open-resources-thread", handleOpenResourcesThread as unknown as EventListener);
    };
  }, []);


  // Only auto-scroll when messages are added, not when component re-renders
  const previousMessagesLengthRef = useRef<number>(0);
  
  useEffect(() => {
    // Only scroll if new messages were added (length increased)
    if (messages.length > previousMessagesLengthRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
    previousMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedThread) return;

    if (!selectedThread.first_message_sent) {
      const isPoster = selectedThread.type === "job"
        ? Number(selectedThread.job_poster_user_id) === Number(userId)
        : Number(selectedThread.listing_poster_user_id) === Number(userId);
      if (!isPoster) {
        toast.error(`Only the ${selectedThread.type === "job" ? "job poster" : "listing poster"} can send the first message`);
        return;
      }
    }

    try {
      setSending(true);
      const sentMessage = selectedThread.type === "job"
        ? await sendMessage(selectedThread.id, messageText.trim())
        : selectedThread.type === "buy-sell"
          ? await sendBuySellMessage(selectedThread.id, messageText.trim())
          : await sendResourcesMessage(selectedThread.id, messageText.trim());
      
      setMessages((prev) => {
        if (prev.some((m) => m.id === sentMessage.id && m.type === selectedThread.type)) {
          return prev;
        }
        return [...prev, { ...sentMessage, type: selectedThread.type }];
      });
      setMessageText("");
      
      // Scroll will happen automatically via the messages.length useEffect
      
      // Thread list will be updated via WebSocket event
    } catch (err: any) {
      console.error("Error sending message:", err);
      toast.error(err?.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const filteredThreads = allThreads.filter(
    (thread) => {
      const title = thread.type === "job" ? thread.job_title : thread.listing_title;
      const applicantName = thread.applicant_name;
      const posterName = thread.type === "job" ? thread.job_poster_name : thread.listing_poster_name;
      const query = searchQuery.toLowerCase();
      return (
        title?.toLowerCase().includes(query) ||
        applicantName?.toLowerCase().includes(query) ||
        posterName?.toLowerCase().includes(query) ||
        thread.last_message?.toLowerCase().includes(query)
      );
    }
  );

  const isPoster = selectedThread 
    ? (selectedThread.type === "job"
        ? Number(selectedThread.job_poster_user_id) === Number(userId)
        : Number(selectedThread.listing_poster_user_id) === Number(userId))
    : false;
  const isJobPoster = isPoster;
  const otherPersonName = selectedThread
    ? isPoster
      ? selectedThread.applicant_name
      : (selectedThread.type === "job" ? selectedThread.job_poster_name : selectedThread.listing_poster_name)
    : "";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-gray-500">Loading messages...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white dark:bg-gray-900">
      {/* Left Sidebar - Chat List */}
      <div className={`${showChat ? "hidden md:flex" : "flex"} w-full md:w-80 border-r border-gray-200 dark:border-gray-800 flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">Messages</h2>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              style={{ "--tw-ring-color": "#53ca97" } as any}
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No messages yet</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const isSelected = selectedThread?.id === thread.id && selectedThread?.type === thread.type;
              const isPoster = thread.type === "job" 
                ? Number(thread.job_poster_user_id) === Number(userId)
                : Number(thread.listing_poster_user_id) === Number(userId);
              const otherName = isPoster 
                ? thread.applicant_name
                : (thread.type === "job" ? thread.job_poster_name : thread.listing_poster_name);
              const threadTitle = thread.type === "job" ? thread.job_title : thread.listing_title;

              return (
                <div
                  key={`${thread.type}-${thread.id}`}
                  onClick={() => {
                    setSelectedThread(thread);
                    setShowChat(true);
                  }}
                  className={`p-4 border-b border-gray-200 dark:border-gray-800 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/20 border-l-4"
                      : "border-l-4 border-l-transparent"
                  }`}
                  style={isSelected ? { borderLeftColor: "#53ca97" } : {}}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        {thread.type === "job" ? (
                          <Briefcase className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        ) : thread.type === "buy-sell" ? (
                          <DollarSign className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        ) : (
                          <Briefcase className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-semibold truncate text-gray-900 dark:text-white">
                          {threadTitle}
                        </h3>
                        {thread.last_message_at && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                            {new Date(thread.last_message_at).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">
                        {isPoster ? "Applicant" : (thread.type === "job" ? "Job Poster" : thread.type === "buy-sell" ? "Listing Poster" : "Resource Poster")}: {otherName}
                      </p>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {thread.last_message || "No messages yet"}
                        </p>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          {!thread.first_message_sent && (
                            <Badge variant="outline" className="text-xs">
                              Waiting
                            </Badge>
                          )}
                          {thread.unread_count && thread.unread_count > 0 && (
                            <Badge
                              className="text-xs px-2 py-0.5"
                              style={{ backgroundColor: "#53ca97", color: "white" }}
                            >
                              {thread.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Side - Active Chat */}
      {selectedThread ? (
        <div className={`${showChat ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
          {/* Chat Header */}
          <div className="border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowChat(false)}
                  className="md:hidden mr-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{otherPersonName}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {isPoster ? "Applicant" : (selectedThread.type === "job" ? "Job Poster" : selectedThread.type === "buy-sell" ? "Listing Poster" : "Resource Poster")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isPoster && applicantInfo && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setShowProfile(true)}
                  >
                    <User className="w-3 h-3 mr-1" />
                    View Profile
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Job/Listing/Resource Details - Pinned */}
          {((selectedThread?.type === "job" && jobDetails) || (selectedThread?.type === "buy-sell" && buySellDetails) || (selectedThread?.type === "resources" && resourcesDetails)) && (
            <div className="px-4 md:px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: "#53ca97" }}
                    >
                      {selectedThread?.type === "job" ? (
                        <Briefcase className="w-4 h-4 text-white" />
                      ) : selectedThread?.type === "buy-sell" ? (
                        <DollarSign className="w-4 h-4 text-white" />
                      ) : (
                        <Briefcase className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-blue-600 dark:text-blue-400">Regarding:</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedThread?.type === "job" ? jobDetails?.title : selectedThread?.type === "buy-sell" ? buySellDetails?.title : resourcesDetails?.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => setShowJobDetails(true)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    View Details
                  </Button>
                </div>

                {/* Job/Listing/Resource Details Card - Clickable */}
                {selectedThread?.type === "job" && jobDetails ? (
                  <div 
                    className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
                    onClick={() => setShowJobDetails(true)}
                  >
                    {jobDetails.location && (
                      <div className="col-span-2">
                        <div className="flex items-center gap-2 text-xs">
                          <MapPin className="w-3 h-3 text-gray-500" />
                          <span className="text-gray-600 dark:text-gray-400">{jobDetails.location}</span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Job Type</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {jobDetails.job_type.replace("-", " ")}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Location Type</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {jobDetails.location_type.replace("-", " ")}
                      </p>
                    </div>
                    
                    {jobDetails.salary && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Salary</p>
                        <p className="text-sm" style={{ color: "#53ca97" }}>
                          {jobDetails.salary}
                          {jobDetails.salary_frequency && ` / ${jobDetails.salary_frequency}`}
                        </p>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-center" style={{ color: "#53ca97" }}>
                        Click to view full job details →
                      </p>
                    </div>
                  </div>
                ) : buySellDetails ? (
                  <div 
                    className="grid grid-cols-2 gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-100 dark:border-blue-800 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-700 transition-all cursor-pointer"
                    onClick={() => setShowJobDetails(true)}
                  >
                    <div className="col-span-2">
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">{buySellDetails.city}, {buySellDetails.state}</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {buySellDetails.category}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Type</p>
                      <p className="text-sm text-gray-900 dark:text-white capitalize">
                        {buySellDetails.listing_type.replace("-", " ")}
                      </p>
                    </div>
                    
                    {buySellDetails.price && (
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Price</p>
                        <p className="text-sm" style={{ color: "#53ca97" }}>
                          ${buySellDetails.price.toLocaleString()}
                          {buySellDetails.price_type && (
                            <span className="text-xs text-gray-500 ml-2">
                              ({buySellDetails.price_type.replace("-", " ")})
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    <div className="col-span-2 mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
                      <p className="text-xs text-center" style={{ color: "#53ca97" }}>
                        Click to view full listing details →
                      </p>
                    </div>
                  </div>
                ) : resourcesDetails ? (
                  <div className="space-y-4">
                    {resourcesDetails.description && (
                      <div>
                        <h4 className="mb-2 font-semibold">Description</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{resourcesDetails.description}</p>
                      </div>
                    )}
                    {resourcesDetails.type_specific_data && Object.keys(resourcesDetails.type_specific_data).length > 0 && (
                      <div>
                        <h4 className="mb-2 font-semibold">Details</h4>
                        <div className="space-y-2">
                          {Object.entries(resourcesDetails.type_specific_data).map(([key, value]) => {
                            if (!value) return null;
                            return (
                              <div key={key} className="text-sm">
                                <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                                <span className="text-gray-900 dark:text-white">{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="pt-4 border-t">
                      <h4 className="mb-2 font-semibold">Contact Information</h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {resourcesDetails.contact_name && (
                          <p><strong>Contact Person:</strong> {resourcesDetails.contact_name}</p>
                        )}
                        <p><strong>Phone:</strong> {resourcesDetails.contact_phone}</p>
                        {resourcesDetails.contact_email && (
                          <p><strong>Email:</strong> {resourcesDetails.contact_email}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-gray-50 dark:bg-gray-900"
          >
            {messagesLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400">Loading messages...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                <p className="text-sm">No messages yet</p>
                {!selectedThread.first_message_sent && (
                  <p className="text-xs mt-2">
                    {isPoster
                      ? "Start the conversation by sending the first message"
                      : `Waiting for the ${selectedThread.type === "job" ? "job poster" : selectedThread.type === "buy-sell" ? "listing poster" : "resource poster"} to send the first message`}
                  </p>
                )}
              </div>
            ) : (
              messages.map((message) => {
                const isCurrentUser = Number(message.sender_user_id) === Number(userId);
                return (
                  <div
                    key={message.id}
                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md px-4 py-3 rounded-lg ${
                        isCurrentUser
                          ? "text-white"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                      }`}
                      style={isCurrentUser ? { backgroundColor: "#53ca97" } : {}}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isCurrentUser ? "text-white/80" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {new Date(message.created_at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 dark:border-gray-800 px-4 md:px-6 py-4 bg-white dark:bg-gray-900">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    !selectedThread.first_message_sent && !isPoster
                      ? `Waiting for ${selectedThread.type === "job" ? "job poster" : selectedThread.type === "buy-sell" ? "listing poster" : "resource poster"} to send first message...`
                      : "Type a message..."
                  }
                  rows={1}
                  disabled={!selectedThread.first_message_sent && !isPoster}
                  className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ "--tw-ring-color": "#53ca97" } as any}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sending || (!selectedThread.first_message_sent && !isPoster)}
                className="px-4 py-2 text-sm"
                style={{ backgroundColor: "#53ca97", color: "white" }}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hidden md:flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center">
            <MessageSquare className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Select a conversation to start messaging</p>
          </div>
        </div>
      )}

      {/* Job/Listing/Resource Details Dialog */}
      {((selectedThread?.type === "job" && jobDetails) || (selectedThread?.type === "buy-sell" && buySellDetails) || (selectedThread?.type === "resources" && resourcesDetails)) && (
        <Dialog open={showJobDetails} onOpenChange={setShowJobDetails}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedThread?.type === "job" 
                  ? jobDetails?.title 
                  : selectedThread?.type === "buy-sell" 
                    ? buySellDetails?.title 
                    : resourcesDetails?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedThread?.type === "job" && jobDetails
                  ? `${jobDetails.posted_by_role?.charAt(0).toUpperCase() + jobDetails.posted_by_role?.slice(1)} Job`
                  : selectedThread?.type === "buy-sell" && buySellDetails
                    ? `${buySellDetails.listing_type?.replace("-", " ").charAt(0).toUpperCase() + buySellDetails.listing_type?.replace("-", " ").slice(1)} • ${buySellDetails.category?.charAt(0).toUpperCase() + buySellDetails.category?.slice(1)}`
                    : selectedThread?.type === "resources" && resourcesDetails
                      ? `Resource • ${resourcesDetails.resource_type?.charAt(0).toUpperCase() + resourcesDetails.resource_type?.slice(1)}`
                      : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {selectedThread?.type === "job" && jobDetails && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-gray-400" />
                    <span className="capitalize">{jobDetails.posted_by_role}</span>
                  </div>
                  {jobDetails.location && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{jobDetails.location}</span>
                      </div>
                    </>
                  )}
                  <Badge
                    className="px-2 py-1 text-xs capitalize"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                  >
                    {jobDetails.job_type.replace("-", " ")}
                  </Badge>
                </div>
              )}
              {selectedThread?.type === "buy-sell" && buySellDetails && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{buySellDetails.city}, {buySellDetails.state}</span>
                  </div>
                  <Badge
                    className="px-2 py-1 text-xs capitalize"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                  >
                    {buySellDetails.category}
                  </Badge>
                </div>
              )}
              {selectedThread?.type === "resources" && resourcesDetails && (
                <div className="flex items-center gap-4 text-sm">
                  {resourcesDetails.city && resourcesDetails.state && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{resourcesDetails.city}, {resourcesDetails.state}</span>
                    </div>
                  )}
                  <Badge
                    className="px-2 py-1 text-xs capitalize"
                    style={{ backgroundColor: "#53ca97", color: "white" }}
                  >
                    {resourcesDetails.resource_type}
                  </Badge>
                </div>
              )}

              {selectedThread?.type === "job" && jobDetails && (
                <>
                  {jobDetails.salary && (
                    <div className="py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Salary Range</div>
                      <div className="text-lg" style={{ color: "#53ca97" }}>
                        {jobDetails.salary}
                        {jobDetails.salary_frequency && ` / ${jobDetails.salary_frequency}`}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="mb-2 font-semibold">Job Description</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{jobDetails.description}</p>
                  </div>

                  {jobDetails.required_skills && (
                    <div>
                      <h4 className="mb-2 font-semibold">Required Skills / Experience</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{jobDetails.required_skills}</p>
                    </div>
                  )}

                  {(jobDetails.benefits_accommodation ||
                    jobDetails.benefits_food ||
                jobDetails.benefits_fuel ||
                jobDetails.benefits_vehicle ||
                jobDetails.benefits_bonus ||
                jobDetails.benefits_others) && (
                <div>
                  <h4 className="mb-2 font-semibold">Benefits</h4>
                  <div className="flex flex-wrap gap-2">
                    {jobDetails.benefits_accommodation && <Badge variant="outline">Accommodation</Badge>}
                    {jobDetails.benefits_food && <Badge variant="outline">Food</Badge>}
                    {jobDetails.benefits_fuel && <Badge variant="outline">Fuel Allowance</Badge>}
                    {jobDetails.benefits_vehicle && <Badge variant="outline">Vehicle</Badge>}
                    {jobDetails.benefits_bonus && <Badge variant="outline">Bonus</Badge>}
                    {jobDetails.benefits_others && <Badge variant="outline">Others</Badge>}
                  </div>
                </div>
              )}
              </>
              )}

              {selectedThread?.type === "job" && jobDetails && (
                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-semibold">Contact Information</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>
                      <strong>Contact Person:</strong> {jobDetails.contact_person}
                    </p>
                    <p>
                      <strong>Phone:</strong> {jobDetails.contact_phone}
                    </p>
                    {jobDetails.preferred_call_time && (
                      <p>
                        <strong>Preferred Call Time:</strong> {jobDetails.preferred_call_time}
                      </p>
                    )}
                    {jobDetails.contact_email && (
                      <p>
                        <strong>Email:</strong> {jobDetails.contact_email}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedThread?.type === "buy-sell" && buySellDetails && (
                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-semibold">Contact Information</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>
                      <strong>Contact Person:</strong> {buySellDetails.contact_name}
                    </p>
                    <p>
                      <strong>Phone:</strong> {buySellDetails.contact_phone}
                    </p>
                    {buySellDetails.contact_email && (
                      <p>
                        <strong>Email:</strong> {buySellDetails.contact_email}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {selectedThread?.type === "resources" && resourcesDetails && (
                <div className="pt-4 border-t">
                  <h4 className="mb-2 font-semibold">Contact Information</h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    {resourcesDetails.contact_name && (
                      <p>
                        <strong>Contact Person:</strong> {resourcesDetails.contact_name}
                      </p>
                    )}
                    <p>
                      <strong>Phone:</strong> {resourcesDetails.contact_phone}
                    </p>
                    {resourcesDetails.contact_email && (
                      <p>
                        <strong>Email:</strong> {resourcesDetails.contact_email}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Applicant Profile Dialog */}
      {applicantInfo && selectedThread && (
        <Dialog open={showProfile} onOpenChange={setShowProfile}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Applicant Profile</DialogTitle>
              <DialogDescription>{applicantInfo.name}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{applicantInfo.name}</h3>
                  <Badge
                    className="text-xs mt-1"
                    style={
                      applicantInfo.status === "accepted"
                        ? { backgroundColor: "#10b981", color: "white" }
                        : applicantInfo.status === "rejected"
                          ? { backgroundColor: "#ef4444", color: "white" }
                          : applicantInfo.status === "reviewing"
                            ? { backgroundColor: "#3b82f6", color: "white" }
                            : { backgroundColor: "#6b7280", color: "white" }
                    }
                  >
                    {applicantInfo.status}
                  </Badge>
                </div>
              </div>

              <div className="pt-4 border-t space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Mail className="w-4 h-4" />
                    <strong>Email:</strong>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white ml-6">{applicantInfo.email}</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Phone className="w-4 h-4" />
                    <strong>Phone:</strong>
                  </div>
                  <p className="text-sm text-gray-900 dark:text-white ml-6">{applicantInfo.phone}</p>
                </div>

                {applicantInfo.cover_letter && (
                  <div>
                    <h4 className="mb-2 font-semibold">Cover Letter</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{applicantInfo.cover_letter}</p>
                  </div>
                )}

                {applicantInfo.resume_url && (
                  <div>
                    <h4 className="mb-2 font-semibold">Resume</h4>
                    <a
                      href={`${API_BASE_URL}${applicantInfo.resume_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      View Resume
                    </a>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Applied on {new Date(applicantInfo.applied_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
