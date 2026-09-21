"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  Trash2,
  ArrowLeft,
  Wifi,
  WifiOff,
  ShieldCheck,
  Crown,
  AlertCircle,
  Clock,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { fetchClubById, fetchClubMessages } from "@/lib/api";
import { ClubItem, ClubMessage } from "@/types/campus";
import { CampusWebSocketClient } from "@/lib/websocket";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClubChatPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const clubId = resolvedParams.id;

  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

  const [club, setClub] = useState<ClubItem | null>(null);
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected" | "unauthorized">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const wsClientRef = useRef<CampusWebSocketClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Authentication check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/clubs/${clubId}/chat`);
    }
  }, [authLoading, isAuthenticated, router, clubId]);

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load initial club detail and message history
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!token) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        const [clubData, msgHistory] = await Promise.all([
          fetchClubById(clubId, token),
          fetchClubMessages(clubId, token).catch(() => []),
        ]);

        if (isMounted) {
          setClub(clubData);
          setMessages(msgHistory);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setErrorMessage((err as Error).message || "Failed to load club chat.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (isAuthenticated && token) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [clubId, isAuthenticated, token]);

  // Connect WebSocket
  useEffect(() => {
    if (!isAuthenticated || !token || !clubId) return;

    const client = new CampusWebSocketClient({
      path: `/ws/clubs/${clubId}/chat/`,
      token,
      onOpen: () => {
        setWsStatus("connected");
      },
      onClose: (e) => {
        if (e.code === 4003) {
          setWsStatus("unauthorized");
          setErrorMessage("Only approved club members and officers can access the community chat.");
        } else {
          setWsStatus("disconnected");
        }
      },
      onError: () => {
        setWsStatus("disconnected");
      },
      onMessage: (data) => {
        if (data.type === "new_message" && data.message) {
          setMessages((prev) => {
            // Avoid duplicate if optimistic message was appended
            if (prev.some((m) => m.id === data.message.id)) {
              return prev;
            }
            return [...prev, data.message];
          });
        } else if (data.type === "message_deleted" && data.message_id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === data.message_id ? { ...m, is_deleted: true } : m))
          );
        }
      },
    });

    wsClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      wsClientRef.current = null;
    };
  }, [clubId, isAuthenticated, token]);

  // Send message
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || sending) return;

    if (trimmed.length > 2000) {
      alert("Message exceeds maximum length of 2000 characters.");
      return;
    }

    setSending(true);
    const sent = wsClientRef.current?.send({
      action: "send_message",
      content: trimmed,
    });

    if (sent) {
      setInputText("");
    } else {
      alert("Failed to send message: chat is currently disconnected.");
    }
    setSending(false);
  };

  // Delete message
  const handleDeleteMessage = (messageId: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    wsClientRef.current?.send({
      action: "delete_message",
      message_id: messageId,
    });
  };

  const isLeader = club?.is_leader;
  const isMember = club?.user_membership_status === "approved" || isLeader || user?.role === "admin";

  const formatMessageTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Sticky Navigation Bar */}
      <div className="sticky top-16 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/clubs/${clubId}`}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Back to Club"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-indigo-500/20">
              {club?.name ? club.name.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[200px] sm:max-w-md">
                  {club ? club.name : "Club Community Chat"}
                </h1>
                <span className="hidden sm:inline-flex text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Member Chat
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {club ? `${club.member_count} members` : "Connecting to room..."}
              </p>
            </div>
          </div>
        </div>

        {/* Live status badge */}
        <div className="flex items-center gap-2">
          {wsStatus === "connected" ? (
            <span
              id="chat-ws-status-connected"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm"
            >
              <Wifi className="w-3.5 h-3.5 animate-pulse" />
              <span>Live Chat</span>
            </span>
          ) : wsStatus === "connecting" ? (
            <span
              id="chat-ws-status-connecting"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
            >
              <Clock className="w-3.5 h-3.5 animate-spin" />
              <span>Connecting...</span>
            </span>
          ) : wsStatus === "unauthorized" ? (
            <span
              id="chat-ws-status-unauthorized"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Members Only</span>
            </span>
          ) : (
            <span
              id="chat-ws-status-disconnected"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            >
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline (Reconnecting)</span>
            </span>
          )}

          <Link href={`/clubs/${clubId}`}>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex text-xs">
              Club Hub
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Chat Feed Container */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-between">
        {/* Error or Unauthorized Banner */}
        {wsStatus === "unauthorized" ? (
          <div className="my-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/50 shadow-lg text-center space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-950 text-rose-600 flex items-center justify-center">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Member Chat Access Required
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {errorMessage || `This chat room is reserved for approved members of ${club?.name || "this club"}. Submit a membership request on the club page to participate.`}
              </p>
            </div>
            <Link href={`/clubs/${clubId}`}>
              <Button variant="primary" size="sm">
                Go to Club Profile &rarr;
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {/* Club guidelines info box */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 flex items-center gap-3">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Welcome to the official {club?.name || "club"} community room! Messages are broadcast in real time to all approved members.
              </span>
            </div>

            {/* Chat Messages */}
            {loading ? (
              <div className="space-y-3 py-8">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="w-48 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  No messages yet
                </p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Be the first to say hello to your fellow club members!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMyMessage = msg.sender_id === user?.id;
                const canDelete =
                  isMyMessage || isLeader || user?.role === "admin" || user?.is_staff;

                return (
                  <div
                    key={msg.id}
                    id={`chat-msg-${msg.id}`}
                    className={`flex items-end gap-2.5 group ${
                      isMyMessage ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    {/* User Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white ${
                        isMyMessage
                          ? "bg-indigo-600"
                          : msg.sender_role === "club_leader"
                          ? "bg-amber-600"
                          : "bg-slate-600"
                      }`}
                      title={msg.sender_name || msg.sender_email}
                    >
                      {msg.sender_name ? msg.sender_name.charAt(0).toUpperCase() : "U"}
                    </div>

                    {/* Message Bubble Container */}
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${
                        isMyMessage ? "items-end" : "items-start"
                      }`}
                    >
                      {/* Sender Name & Role Label */}
                      <div className="flex items-center gap-1.5 px-1 mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {isMyMessage ? "You" : msg.sender_name || msg.sender_email}
                        </span>
                        {msg.sender_role === "club_leader" && (
                          <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                            <Crown className="w-2.5 h-2.5" />
                            Leader
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {formatMessageTime(msg.created_at)}
                        </span>
                      </div>

                      {/* Message Content Bubble */}
                      <div className="flex items-center gap-2">
                        {isMyMessage && canDelete && !msg.is_deleted && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-opacity"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div
                          className={`p-3.5 rounded-2xl shadow-sm text-sm break-words ${
                            msg.is_deleted
                              ? "bg-slate-100 dark:bg-slate-900 text-slate-400 italic border border-dashed border-slate-300 dark:border-slate-800"
                              : isMyMessage
                              ? "bg-indigo-600 text-white rounded-br-none"
                              : "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-800"
                          }`}
                        >
                          {msg.is_deleted ? "This message was deleted." : msg.content}
                        </div>

                        {!isMyMessage && canDelete && !msg.is_deleted && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-opacity"
                            title="Delete message"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input Bar */}
        {wsStatus !== "unauthorized" && isMember && (
          <form
            onSubmit={handleSendMessage}
            className="sticky bottom-4 mt-auto pt-2 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-2 shadow-lg flex items-center gap-2"
          >
            <input
              id="club-chat-input"
              type="text"
              placeholder="Type your message to the club..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={wsStatus !== "connected" || sending}
              maxLength={2000}
              className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
            />

            <Button
              id="club-chat-send-btn"
              type="submit"
              size="sm"
              disabled={!inputText.trim() || wsStatus !== "connected" || sending}
              className="gap-1.5 px-4 shadow-md shadow-indigo-600/30"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
