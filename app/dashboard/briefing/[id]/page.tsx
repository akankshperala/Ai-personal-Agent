"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format, parseISO } from "date-fns";
import { useAuth } from "@/components/auth-provider";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  AtSign,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Send,
  X,
  ChevronRight,
  RefreshCw,
  User,
  Clock,
  AlertTriangle,
  FileText,
  Loader2
} from "lucide-react";

const CATEGORIES = [
  { key: "email", label: "Email", icon: Mail, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", activeColor: "bg-blue-500 text-white border-blue-500" },
  { key: "messages", label: "Messages", icon: MessageSquare, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", activeColor: "bg-emerald-500 text-white border-emerald-500" },
  { key: "mentions", label: "Mentions", icon: AtSign, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", activeColor: "bg-violet-500 text-white border-violet-500" },
  { key: "tasks", label: "Tasks", icon: CheckCircle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", activeColor: "bg-amber-500 text-white border-amber-500" },
  { key: "follow_ups", label: "Follow-Ups", icon: ArrowRight, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", activeColor: "bg-rose-500 text-white border-rose-500" },
];

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  High: { label: "High", color: "text-rose-400 bg-rose-500/10 border-rose-500/20", dot: "bg-rose-500" },
  Medium: { label: "Medium", color: "text-amber-400 bg-amber-500/10 border-amber-500/20", dot: "bg-amber-500" },
  Low: { label: "Low", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", dot: "bg-blue-500" },
};

const appLogos: Record<string, string> = {
  gmail: "/001-gmail.png",
  whatsapp: "/002-whatsapp.png",
  telegram: "/004-telegram.png",
  slack: "/005-slack.png",
};

function AppLogo({ app }: { app: string }) {
  const src = appLogos[app?.toLowerCase()];
  if (src) return <img src={src} alt={app} className="w-4 h-4 object-contain" />;
  return <FileText className="w-4 h-4 text-slate-400" />;
}

// ── Compose Panel ─────────────────────────────────────────────────────────────
interface ComposePanelProps {
  item: any;
  type: "email" | "message";
  userId: string;
  onClose: () => void;
}

function ComposePanel({ item, type, userId, onClose }: ComposePanelProps) {
  const [draft, setDraft] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [to, setTo] = useState(type === "email" ? (item.from?.match(/<(.+)>/)?.[1] || item.from || "") : (item.from || ""));
  const [subject, setSubject] = useState(type === "email" ? `Re: ${item.subject || ""}` : "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleDraftWithAI = async () => {
    setDrafting(true);
    setError("");
    try {
      const res = await fetch("/api/briefings/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          from: item.from,
          subject: item.subject,
          body: item.body || item.snippet,
          replyType: type
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDraft(data.draft || "");
      } else {
        setError("AI draft failed. Please try again.");
      }
    } catch {
      setError("AI draft failed. Please try again.");
    } finally {
      setDrafting(false);
    }
  };

  const handleSend = async () => {
    if (!draft.trim() || !to.trim()) return;
    setSending(true);
    setError("");
    try {
      const endpoint = type === "email" ? "/api/gmail-mcp" : "/api/whatsapp-mcp";
      const params = type === "email"
        ? { to, subject, body: draft }
        : { to, body: draft };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: type === "email" ? "gmail_send_message" : "whatsapp_send_message", params, userId })
      });
      if (res.ok) {
        setSent(true);
      } else {
        setError("Failed to send. Please try again.");
      }
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1">{type === "email" ? "Email Sent!" : "Message Sent!"}</h4>
        <p className="text-xs text-slate-400 mb-4">Your {type === "email" ? "email" : "message"} was delivered successfully.</p>
        <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition">Close</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white">
          {type === "email" ? "Compose Email Reply" : "Compose Message"}
        </h4>
        <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Original context */}
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-600 dark:text-slate-300">Replying to:</span>{" "}
        {item.from} {item.subject ? `— ${item.subject}` : ""}
      </div>

      {/* To field */}
      <div>
        <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
          {type === "email" ? "To" : "Recipient"}
        </label>
        <input
          type="text"
          value={to}
          onChange={e => setTo(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
        />
      </div>

      {/* Subject for email */}
      {type === "email" && (
        <div>
          <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
          />
        </div>
      )}

      {/* Message body */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Message</label>
          <button
            onClick={handleDraftWithAI}
            disabled={drafting}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50"
          >
            {drafting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {drafting ? "Drafting…" : "Draft with AI"}
          </button>
        </div>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Write your reply, or click 'Draft with AI' to get a suggestion…"
          rows={6}
          className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition resize-none"
        />
      </div>

      {error && (
        <p className="text-[11px] text-rose-400 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" /> {error}
        </p>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !draft.trim() || !to.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 hover:opacity-90 transition disabled:opacity-50"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        {sending ? "Sending…" : `Send ${type === "email" ? "Email" : "Message"}`}
      </button>
    </div>
  );
}

// ── Item Cards ────────────────────────────────────────────────────────────────
function EmailItem({ item, onReply }: { item: any; onReply: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 transition space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
          <AppLogo app={item.app || "gmail"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{item.subject || "No Subject"}</p>
              <p className="text-[11px] text-slate-400 truncate">{item.from}</p>
            </div>
            <span className="text-[10px] text-slate-400 flex-shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {item.time}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {expanded ? (item.body || item.snippet) : item.snippet}
      </p>
      <div className="flex items-center gap-2 pt-1">
        {item.body && item.body !== item.snippet && (
          <button onClick={() => setExpanded(!expanded)} className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={onReply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[11px] font-semibold hover:bg-blue-500/20 transition"
          >
            <Send className="w-3 h-3" /> Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageItem({ item, onReply }: { item: any; onReply: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 transition space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <AppLogo app={item.app || "whatsapp"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{item.from}</p>
              <p className="text-[11px] text-slate-400 capitalize">{item.app}</p>
            </div>
            <span className="text-[10px] text-slate-400 flex-shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {item.time}
            </span>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        {expanded ? (item.body || item.snippet) : item.snippet}
      </p>
      <div className="flex items-center gap-2 pt-1">
        {item.body && item.body !== item.snippet && (
          <button onClick={() => setExpanded(!expanded)} className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button
            onClick={onReply}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 transition"
          >
            <Send className="w-3 h-3" /> Reply
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskItem({ item }: { item: any }) {
  const p = priorityConfig[item.priority] || priorityConfig.Medium;
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 transition">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <AppLogo app={item.app} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.title}</p>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${p.color}`}>{p.label}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.description}</p>
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {item.time}
          </p>
        </div>
      </div>
    </div>
  );
}

function FollowUpItem({ item }: { item: any }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 transition">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
          <AppLogo app={item.app} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.title}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{item.description}</p>
          <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {item.time}
          </p>
        </div>
      </div>
    </div>
  );
}

function MentionItem({ item, onReply }: { item: any; onReply: () => void }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 transition space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
          <AppLogo app={item.app} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{item.from}</p>
            <span className="text-[10px] text-slate-400 flex-shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" /> {item.time}</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">{item.snippet}</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={onReply} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-semibold hover:bg-violet-500/20 transition">
          <Send className="w-3 h-3" /> Reply
        </button>
      </div>
    </div>
  );
}

// ── Page Content ──────────────────────────────────────────────────────────────
function BriefingDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get("category") || "email";
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [composeItem, setComposeItem] = useState<{ item: any; type: "email" | "message" } | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    fetch(`/api/briefings?userId=${user.id}&id=${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setBriefing(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, id]);

  const activeItems = briefing?.data?.[activeCategory] || [];
  const activeCat = CATEGORIES.find(c => c.key === activeCategory) || CATEGORIES[0];
  const ActiveIcon = activeCat.icon;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b17] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading briefing…</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b17] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Briefing not found.</p>
          <button onClick={() => router.back()} className="text-indigo-400 text-sm hover:underline">← Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b17] text-slate-800 dark:text-slate-200">
      {/* ── Top Header Bar ── */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white dark:bg-[#070b17] border-b border-slate-200 dark:border-white/[0.06] px-6 py-3.5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-slate-200 dark:text-white/20">/</span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px] sm:max-w-xs">{briefing.title}</span>
        </div>
        <p className="text-xs text-slate-400 hidden sm:block">
          {briefing.created_at ? format(parseISO(briefing.created_at), "MMMM d, yyyy · h:mm a") : ""}
        </p>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Hero Card ── */}
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-900/30 dark:via-purple-900/10 dark:to-transparent p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-2 mb-2">
                {CATEGORIES.map(cat => {
                  const count = briefing.stats?.[cat.key] ?? 0;
                  return count > 0 ? (
                    <span key={cat.key} className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${cat.bg} ${cat.color}`}>
                      {count} {cat.label}
                    </span>
                  ) : null;
                })}
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{briefing.title}</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{briefing.summary}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Category Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-2 mb-3">Categories</p>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const count = briefing.stats?.[cat.key] ?? 0;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => router.replace(`/dashboard/briefing/${id}?category=${cat.key}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cat.bg}`}>
                      <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                    </span>
                    <span className="flex-1 text-left">{cat.label}</span>
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cat.bg} ${cat.color}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Main Content + Compose ── */}
          <div className="lg:col-span-3 space-y-4">
            {/* Category header */}
            <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-white/[0.06]">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeCat.bg}`}>
                <ActiveIcon className={`w-4 h-4 ${activeCat.color}`} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{activeCat.label}</h2>
                <p className="text-[11px] text-slate-400">{activeItems.length} item{activeItems.length !== 1 ? "s" : ""}</p>
              </div>
            </div>

            {/* Compose Panel */}
            {composeItem && user && (
              <div className="p-5 rounded-2xl bg-white dark:bg-[#0d111e] border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <ComposePanel
                  item={composeItem.item}
                  type={composeItem.type}
                  userId={user.id}
                  onClose={() => setComposeItem(null)}
                />
              </div>
            )}

            {/* Items list */}
            {activeItems.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${activeCat.bg}`}>
                  <ActiveIcon className={`w-5 h-5 ${activeCat.color}`} />
                </div>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">No {activeCat.label}</p>
                <p className="text-xs text-slate-400">Nothing in this category for this briefing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeCategory === "email" && activeItems.map((item: any, i: number) => (
                  <EmailItem
                    key={item.id || i}
                    item={item}
                    onReply={() => setComposeItem({ item, type: "email" })}
                  />
                ))}
                {activeCategory === "messages" && activeItems.map((item: any, i: number) => (
                  <MessageItem
                    key={item.id || i}
                    item={item}
                    onReply={() => setComposeItem({ item, type: "message" })}
                  />
                ))}
                {activeCategory === "mentions" && activeItems.map((item: any, i: number) => (
                  <MentionItem
                    key={item.id || i}
                    item={item}
                    onReply={() => setComposeItem({ item, type: "message" })}
                  />
                ))}
                {activeCategory === "tasks" && activeItems.map((item: any, i: number) => (
                  <TaskItem key={item.id || i} item={item} />
                ))}
                {activeCategory === "follow_ups" && activeItems.map((item: any, i: number) => (
                  <FollowUpItem key={item.id || i} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Route Entry ───────────────────────────────────────────────────────────────
export default function BriefingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-[#070b17] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    }>
      <BriefingDetailContent id={unwrappedParams.id} />
    </Suspense>
  );
}
