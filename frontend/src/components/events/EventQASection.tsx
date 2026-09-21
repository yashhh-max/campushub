"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MessageSquare,
  ThumbsUp,
  Send,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  fetchEventQuestions,
  createEventQuestion,
  answerEventQuestion,
  upvoteEventQuestion,
} from "@/lib/api";
import { EventQuestion } from "@/types/campus";
import { CampusWebSocketClient } from "@/lib/websocket";

interface EventQASectionProps {
  eventId: string | number;
  isOrganizer: boolean;
  token: string | null;
}

export function EventQASection({
  eventId,
  isOrganizer,
  token,
}: EventQASectionProps) {
  const [questions, setQuestions] = useState<EventQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [activeReplyQuestionId, setActiveReplyQuestionId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const [sortBy, setSortBy] = useState<"upvotes" | "recent">("upvotes");

  // Load questions on mount
  useEffect(() => {
    let active = true;
    async function loadQuestions() {
      setLoading(true);
      try {
        const data = await fetchEventQuestions(eventId, token || undefined);
        if (active) {
          setQuestions(data);
        }
      } catch {
        if (active) setQuestions([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadQuestions();
    return () => {
      active = false;
    };
  }, [eventId, token]);

  // Connect Real-Time Q&A WebSocket
  useEffect(() => {
    if (!eventId) return;

    const wsClient = new CampusWebSocketClient({
      path: `/ws/events/${eventId}/qa/`,
      token,
      onMessage: (data) => {
        if (data.type === "question_created" && data.question) {
          setQuestions((prev) => {
            if (prev.some((q) => q.id === data.question.id)) return prev;
            return [data.question, ...prev];
          });
        } else if (data.type === "answer_created" && data.answer && data.question_id) {
          setQuestions((prev) =>
            prev.map((q) => {
              if (q.id === data.question_id) {
                const currentAnswers = q.answers || [];
                if (currentAnswers.some((a) => a.id === data.answer.id)) return q;
                return {
                  ...q,
                  answers: [...currentAnswers, data.answer],
                };
              }
              return q;
            })
          );
        } else if (data.type === "question_upvoted" && data.question_id) {
          setQuestions((prev) =>
            prev.map((q) => {
              if (q.id === data.question_id) {
                return {
                  ...q,
                  upvotes_count: data.upvotes_count,
                };
              }
              return q;
            })
          );
        }
      },
    });

    wsClient.connect();

    return () => {
      wsClient.disconnect();
    };
  }, [eventId, token]);

  // Ask Question
  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    const trimmed = newQuestionText.trim();
    if (!trimmed || submittingQuestion) return;

    setSubmittingQuestion(true);
    try {
      const created = await createEventQuestion(eventId, trimmed, token);
      setQuestions((prev) => {
        if (prev.some((q) => q.id === created.id)) return prev;
        return [created, ...prev];
      });
      setNewQuestionText("");
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to post question.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  // Upvote Question
  const handleUpvote = async (q: EventQuestion) => {
    if (!token) {
      alert("Please sign in to upvote questions.");
      return;
    }

    // Optimistic toggle
    const willUpvote = !q.has_upvoted;
    const newCount = willUpvote ? q.upvotes_count + 1 : Math.max(0, q.upvotes_count - 1);

    setQuestions((prev) =>
      prev.map((item) =>
        item.id === q.id
          ? { ...item, has_upvoted: willUpvote, upvotes_count: newCount }
          : item
      )
    );

    try {
      const res = await upvoteEventQuestion(q.id, token);
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? { ...item, has_upvoted: res.has_upvoted, upvotes_count: res.upvotes_count }
            : item
        )
      );
    } catch {
      // revert
      setQuestions((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? { ...item, has_upvoted: q.has_upvoted, upvotes_count: q.upvotes_count }
            : item
        )
      );
    }
  };

  // Submit Answer (Organizer or Attendee)
  const handleSubmitAnswer = async (questionId: number) => {
    if (!token) return;
    const trimmed = replyText.trim();
    if (!trimmed || submittingReply) return;

    setSubmittingReply(true);
    try {
      const ans = await answerEventQuestion(questionId, trimmed, isOrganizer, token);
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id === questionId) {
            const list = q.answers || [];
            if (list.some((a) => a.id === ans.id)) return q;
            return { ...q, answers: [...list, ans] };
          }
          return q;
        })
      );
      setReplyText("");
      setActiveReplyQuestionId(null);
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to post answer.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const sortedQuestions = [...questions].sort((a, b) => {
    if (sortBy === "upvotes") {
      return b.upvotes_count - a.upvotes_count;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
      if (diffSec < 60) return "Just now";
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return `${Math.floor(diffSec / 86400)}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <div className="mt-10 pt-10 border-t border-slate-200 dark:border-slate-800 space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <span>Community Q&A</span>
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              {questions.length} Question{questions.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ask questions about parking, prerequisites, materials, or schedules. Questions update in real time.
          </p>
        </div>

        {/* Sort switch */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-auto text-xs font-semibold">
          <button
            onClick={() => setSortBy("upvotes")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              sortBy === "upvotes"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Most Upvoted
          </button>
          <button
            onClick={() => setSortBy("recent")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              sortBy === "recent"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Most Recent
          </button>
        </div>
      </div>

      {/* Ask Question Box */}
      {token ? (
        <form
          onSubmit={handleAskQuestion}
          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-1">
              Q
            </div>
            <textarea
              id="event-qa-input"
              rows={2}
              placeholder="Have a question for the organizers? Ask here..."
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              className="flex-1 p-3 text-sm rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex items-center justify-between pl-11">
            <span className="text-[11px] text-slate-400">
              {newQuestionText.length}/1000 characters
            </span>
            <Button
              id="event-qa-submit-btn"
              type="submit"
              size="sm"
              disabled={!newQuestionText.trim() || submittingQuestion}
              className="gap-1.5 shadow-sm"
            >
              <span>{submittingQuestion ? "Posting..." : "Post Question"}</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
          <span className="text-slate-600 dark:text-slate-300">
            Sign in to ask questions or upvote existing answers.
          </span>
          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs">
              Sign In
            </Button>
          </Link>
        </div>
      )}

      {/* Questions Feed */}
      {loading ? (
        <div className="space-y-4 py-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : sortedQuestions.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
          <HelpCircle className="w-8 h-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            No questions asked yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Got questions regarding venue directions, schedule, or prerequisites? Post the first question above!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedQuestions.map((q) => {
            const hasAnswers = q.answers && q.answers.length > 0;
            const isReplying = activeReplyQuestionId === q.id;

            return (
              <div
                key={q.id}
                id={`qa-question-${q.id}`}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Upvote Pill Button */}
                    <button
                      id={`qa-upvote-btn-${q.id}`}
                      onClick={() => handleUpvote(q)}
                      className={`flex flex-col items-center justify-center min-w-[48px] py-1.5 px-2 rounded-xl border font-bold text-xs transition-all ${
                        q.has_upvoted
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                          : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                      }`}
                      title={q.has_upvoted ? "Remove Upvote" : "Upvote this question"}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 mb-0.5 ${q.has_upvoted ? "fill-white" : ""}`} />
                      <span>{q.upvotes_count}</span>
                    </button>

                    <div className="space-y-1">
                      <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                        {q.content}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>Asked by {q.author_name || "Student"}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(q.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Reply Button toggle */}
                  {token && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (isReplying) {
                          setActiveReplyQuestionId(null);
                        } else {
                          setActiveReplyQuestionId(q.id);
                          setReplyText("");
                        }
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 shrink-0"
                    >
                      {isOrganizer ? "Reply as Organizer" : "Answer"}
                    </Button>
                  )}
                </div>

                {/* Answers Section */}
                {hasAnswers && (
                  <div className="ml-12 pl-4 border-l-2 border-slate-200 dark:border-slate-800 space-y-3 pt-1">
                    {q.answers.map((ans) => (
                      <div
                        key={ans.id}
                        id={`qa-answer-${ans.id}`}
                        className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                          ans.is_official
                            ? "bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80"
                            : "bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {ans.author_name || "Organizer"}
                            </span>
                            {ans.is_official && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                                <ShieldCheck className="w-3 h-3" />
                                Official Organizer Answer
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(ans.created_at)}
                          </span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                          {ans.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Form (When Opened) */}
                {isReplying && (
                  <div className="ml-12 pl-4 border-l-2 border-indigo-400 space-y-2 pt-2 animate-in fade-in-50">
                    <textarea
                      id={`reply-input-${q.id}`}
                      rows={2}
                      placeholder={
                        isOrganizer
                          ? "Write an official organizer answer..."
                          : "Write an answer to help fellow students..."
                      }
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveReplyQuestionId(null)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        id={`submit-reply-btn-${q.id}`}
                        size="sm"
                        disabled={!replyText.trim() || submittingReply}
                        onClick={() => handleSubmitAnswer(q.id)}
                        className="text-xs gap-1"
                      >
                        <span>Submit Answer</span>
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
