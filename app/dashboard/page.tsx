"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Message01Icon,
  SentIcon,
  SparklesIcon,
  CheckmarkCircle02Icon,
  GoogleIcon,
  FolderOpenIcon,
  UserCircleIcon,
  AlertCircleIcon,
  CreditCardIcon,
  CheckmarkCircle01Icon
} from "@hugeicons/core-free-icons";
import {
  MessageSquare,
  Newspaper,
  Send,
  Sparkles,
  CheckCircle,
  FileText,
  User,
  AlertTriangle,
  CreditCard,
  Check,
  ToggleLeft,
  ToggleRight,
  Sun,
  Moon,
  Search,
  Mail,
  Plus,
  Terminal,
  Settings2,
  Settings,
  Plug,
  AlertCircle,
  ExternalLink,
  X,
  Info,
  Globe,
  RefreshCw,
  Eye,
  Trash2,
  ArrowRight,
  HelpCircle,
  ChevronRight,
  Star,
  Mic,
  ArrowUp,
  Link as LinkIcon,
  ShieldCheck,
  Calendar,
  AtSign,
  Bell,
  Clock,
  Flag,
  Bot,
  PauseCircle,
  ClipboardCheck,
  Wand2,
  Database,
  Download,
  LockKeyhole,
  LogOut,
  RotateCcw,
  Save,
  Smartphone
} from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { insforge } from "@/lib/insforge";


// Safe icon renderer helper for page components
interface SafeIconProps {
  hugeIcon: any;
  lucideIcon: React.ComponentType<any>;
  size?: number;
  className?: string;
}

function SafeIcon({ hugeIcon, lucideIcon: LucideIcon, size = 18, className }: SafeIconProps) {
  try {
    if (hugeIcon) {
      return <HugeiconsIcon icon={hugeIcon} size={size} className={className} />;
    }
  } catch (error) {
    console.warn("Error rendering page Hugeicon:", error);
  }
  return <LucideIcon className={className} style={{ width: size, height: size }} />;
}

function DashboardContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("dashboard");

  useEffect(() => {
    const tab = searchParams.get("tab") || "dashboard";
    setActiveTab(tab);
  }, [searchParams]);

  // Render content based on active tab
  switch (activeTab) {
    case "ai-agent":
      return <AiAgentPanel user={user} />;
    case "briefing":
      return <BriefingPanel />;
    case "inbox":
      return <AlertsPanel title="Inbox & Synced Chats" subtitle="All incoming messages and synchronization logs across connected platforms." />;
    case "follow-ups":
      return <AlertsPanel title="Follow-Ups Tracker" subtitle="Manage scheduled reminders and active follow-up tasks." />;
    case "integrations":
      return <IntegrationsPanel />;
    case "alerts":
      return <AlertsPanel />;
    case "settings":
      return <SettingsPanel />;
    case "pricing":
      return <PricingPanel />;
    case "dashboard":
    default:
      return <DashboardOverviewPanel user={user} />;
  }
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
          <p className="text-xs text-slate-500 animate-pulse">Loading dashboard environment...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

/* ==========================================
   DASHBOARD OVERVIEW PANEL
   ========================================== */
function DashboardOverviewPanel({ user }: { user: any }) {
  const router = useRouter();
  const userName = user?.profile?.name || user?.email?.split("@")?.[0] || "Rahul";
  const [briefData, setBriefData] = useState<any>(user?.dashboard_brief || null);
  const [loading, setLoading] = useState(!user?.dashboard_brief);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBriefData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!briefData) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const res = await fetch("/api/dashboard-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          forceRegenerate: isRefresh
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBriefData(data);
      } else {
        console.error("Failed to fetch dashboard brief:", await res.text());
      }
    } catch (err) {
      console.error("Error loading dashboard brief:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Sync state if user.dashboard_brief changes (e.g. from authentication fetch)
  useEffect(() => {
    if (user?.dashboard_brief) {
      setBriefData(user.dashboard_brief);
      setLoading(false);
    }
  }, [user?.dashboard_brief]);

  useEffect(() => {
    if (user?.id) {
      fetchBriefData();
    }
  }, [user?.id]);

  const handleRefresh = () => {
    fetchBriefData(true);
  };

  const handleNavigateToIntegrations = () => {
    router.push("/dashboard?tab=integrations");
  };

  const getAppIcon = (app: string) => {
    switch (app.toLowerCase()) {
      case "gmail":
        return <img src="/001-gmail.png" alt="Gmail" className="w-5 h-5 object-contain" />;
      case "whatsapp":
        return <img src="/002-whatsapp.png" alt="WhatsApp" className="w-5 h-5 object-contain" />;
      case "slack":
        return <img src="/005-slack.png" alt="Slack" className="w-5 h-5 object-contain" />;
      case "outlook":
      case "outlook calendar":
        return <img src="/003-email.png" alt="Outlook" className="w-5 h-5 object-contain" />;
      default:
        return <Globe className="w-5 h-5 text-slate-400" />;
    }
  };

  const stats = briefData?.stats || { importantCount: 0, priorityCount: 0, followUpCount: 0 };
  const briefItems = briefData?.brief || [];
  const priorityItems = briefData?.priorityItems || [];
  const isSimulated = briefData?.isSimulated !== false;

  // Connected apps catalog for rendering - available immediately from user session!
  const appList = [
    { id: "gmail", name: "Gmail", icon: "/001-gmail.png", connected: !!user?.integrations?.gmail?.connected },
    { id: "whatsapp", name: "WhatsApp", icon: "/002-whatsapp.png", connected: !!user?.integrations?.whatsapp?.connected },
    { id: "slack", name: "Slack", icon: "/005-slack.png", connected: !!user?.integrations?.slack?.connected },
    { id: "outlook", name: "Outlook Calendar", icon: "/003-email.png", connected: !!user?.integrations?.outlook?.connected },
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Welcome Banner */}
      <div className="relative p-6 md:p-8 rounded-3xl bg-gradient-to-r from-purple-900/30 via-indigo-900/20 to-blue-900/10 light:from-purple-100/40 light:via-indigo-100/30 light:to-blue-100/20 border border-white/5 light:border-black/5 overflow-hidden shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-purple-500/10 filter blur-[80px] pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-purple-400">
              <SafeIcon hugeIcon={SparklesIcon} lucideIcon={Sparkles} size={16} className="animate-pulse" />
              <span className="text-xs font-semibold tracking-widest uppercase">
                {isSimulated ? "Simulation Environment Active" : "Cognitive Live Sync Engine Active"}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-black dark:text-white">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300 light:from-purple-600 light:to-indigo-550">{userName}</span>
            </h2>
            <p className="text-slate-400 text-sm max-w-xl">
              {isSimulated ? (
                "Your dashboard is running in Simulation Mode. Connect your real Gmail or WhatsApp accounts in the Integrations panel to fetch live data."
              ) : (
                `Gemini has successfully summarized communications across your connected platforms (Gmail and WhatsApp).`
              )}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 font-medium pt-0.5">
              {format(new Date(), "EEEE, MMMM d, yyyy · h:mm a")}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center space-x-2 px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/40 text-white text-xs font-bold rounded-2xl transition shadow-lg shadow-purple-950/20 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Regenerating..." : "Refresh / Regenerate"}</span>
          </button>
        </div>
      </div>



      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Important Card */}
        <div
          onClick={() => router.push("/dashboard?tab=alerts")}
          className="glass-premium p-6 rounded-3xl border border-black/[0.05] dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 flex items-center justify-between transition-all duration-300 cursor-pointer group hover:scale-[1.01] hover:shadow-lg shadow-sm"
        >
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-purple-100 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-500/25 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.12)] group-hover:scale-110 transition-transform duration-300">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Important</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {loading ? <span className="w-6 h-7 bg-black/5 dark:bg-white/10 rounded animate-pulse inline-block" /> : stats.importantCount}
              </h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-bold mt-1">
                {stats.priorityCount || 2} high priority
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-black/[0.05] dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:text-purple-500 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-all">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Schedule Card */}
        <div
          onClick={() => router.push("/dashboard?tab=briefing")}
          className="glass-premium p-6 rounded-3xl border border-black/[0.05] dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 flex items-center justify-between transition-all duration-300 cursor-pointer group hover:scale-[1.01] hover:shadow-lg shadow-sm"
        >
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.12)] group-hover:scale-110 transition-transform duration-300">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Schedule</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {loading ? <span className="w-6 h-7 bg-black/5 dark:bg-white/10 rounded animate-pulse inline-block" /> : (stats.importantCount + stats.priorityCount || 5)}
              </h3>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-bold mt-1">
                {stats.importantCount > 0 ? "1 event today" : "0 events today"}
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-black/[0.05] dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:text-blue-500 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-all">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Follow-Ups Card */}
        <div
          onClick={() => router.push("/dashboard?tab=alerts")}
          className="glass-premium p-6 rounded-3xl border border-black/[0.05] dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 flex items-center justify-between transition-all duration-300 cursor-pointer group hover:scale-[1.01] hover:shadow-lg shadow-sm"
        >
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.12)] group-hover:scale-110 transition-transform duration-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Follow-Ups</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
                {loading ? <span className="w-6 h-7 bg-black/5 dark:bg-white/10 rounded animate-pulse inline-block" /> : stats.followUpCount}
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                {stats.followUpCount || 3} due today
              </p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full border border-black/[0.05] dark:border-white/10 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 hover:bg-black/[0.02] dark:hover:bg-white/5 transition-all">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Three Column Grid (Today's Brief | Connected Apps | Priority Items) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Brief Card */}
        <div className="glass-premium p-6 rounded-3xl border border-black/[0.05] dark:border-white/5 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/5 pb-4">
              <div className="flex items-start space-x-2.5">
                <FileText className="w-5 h-5 text-purple-500 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Today&apos;s Brief</h3>
                  {briefData?.generatedAt && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                      Updated {formatDistanceToNow(parseISO(briefData.generatedAt), { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push("/dashboard?tab=briefing")}
                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 transition flex-shrink-0"
              >
                View all
              </button>
            </div>

            <div className="space-y-5 pt-1">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse"></div>
                </div>
              ) : briefItems.length > 0 ? (
                briefItems.map((item: any, index: number) => {
                  let RightIcon = Check;
                  if (item.title?.toLowerCase().includes("stand-up") || item.title?.toLowerCase().includes("meeting") || item.time?.toLowerCase().includes("am") || item.time?.toLowerCase().includes("pm")) {
                    RightIcon = Calendar;
                  } else if (item.title?.toLowerCase().includes("deck") || item.title?.toLowerCase().includes("file") || item.title?.toLowerCase().includes("report")) {
                    RightIcon = FileText;
                  } else if (item.title?.toLowerCase().includes("flight") || item.title?.toLowerCase().includes("travel")) {
                    RightIcon = Globe;
                  }

                  return (
                    <div key={item.id || index} className="flex items-start justify-between group">
                      <div className="flex items-start space-x-3 pr-2">
                        <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                          {getAppIcon(item.app || "")}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 block mt-1 font-medium">
                            {(() => {
                              if (!item.time) return null;
                              try {
                                const parsed = parseISO(item.time);
                                if (isValid(parsed)) return format(parsed, "MMM d · h:mm a");
                              } catch { }
                              return item.time;
                            })()}
                          </span>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 flex items-center justify-center text-slate-500 flex-shrink-0 group-hover:bg-purple-500/10 transition-colors">
                        <RightIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-purple-500" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex items-start justify-between group">
                    <div className="flex items-start space-x-3 pr-2">
                      <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1 flex-shrink-0">
                        <img src="/005-slack.png" alt="Slack" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Team stand-up in 30 minutes
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 block mt-1 font-medium">10:00 AM - 10:30 AM</span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>

                  <div className="flex items-start justify-between group">
                    <div className="flex items-start space-x-3 pr-2">
                      <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1 flex-shrink-0">
                        <img src="/001-gmail.png" alt="Gmail" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Project Alpha - Q2 review deck updated
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 block mt-1 font-medium">Shared by Priya Sharma</span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>

                  <div className="flex items-start justify-between group">
                    <div className="flex items-start space-x-3 pr-2">
                      <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1 flex-shrink-0">
                        <img src="/002-whatsapp.png" alt="WhatsApp" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          You have 2 pending follow-ups
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 block mt-1 font-medium">One is overdue</span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <Check className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>

                  <div className="flex items-start justify-between group">
                    <div className="flex items-start space-x-3 pr-2">
                      <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1 flex-shrink-0">
                        <img src="/001-gmail.png" alt="Gmail" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          Flight to Bangalore tomorrow
                        </h4>
                        <span className="text-[10px] text-slate-500 dark:text-slate-500 block mt-1 font-medium">6E 2451 at 08:20 AM</span>
                      </div>
                    </div>
                    <div className="w-7 h-7 rounded-xl bg-black/[0.02] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 flex items-center justify-center text-slate-500 flex-shrink-0">
                      <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Connected Apps Card */}
        <div className="glass-premium p-6 rounded-3xl border border-black/[0.05] dark:border-white/5 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/5 pb-4">
              <div className="flex items-center space-x-2.5">
                <LinkIcon className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                <h3 className="text-[13px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Connected Apps</h3>
              </div>
              <button
                onClick={handleNavigateToIntegrations}
                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 transition"
              >
                Manage
              </button>
            </div>

            {/* 2x2 Grid of Connected Apps */}
            <div className="grid grid-cols-2 gap-4 pt-1">
              {appList.map((app) => {
                let LogoComponent = null;
                if (app.id === "calendar") {
                  LogoComponent = (
                    <div className="w-9 h-9 p-0.5 rounded-lg bg-white/5 flex items-center justify-center">
                      <svg viewBox="0 0 48 48" className="w-full h-full object-contain">
                        <rect x="4" y="4" width="40" height="40" rx="8" fill="#4285F4" />
                        <rect x="10" y="14" width="28" height="24" rx="4" fill="#FFFFFF" />
                        <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill="#4285F4" fontSize="16" fontWeight="bold">31</text>
                      </svg>
                    </div>
                  );
                } else {
                  LogoComponent = (
                    <div className="w-9 h-9 p-1 rounded-lg bg-white/5 flex items-center justify-center">
                      <img src={app.icon} alt={app.name} className="w-full h-full object-contain" />
                    </div>
                  );
                }

                // Force status as true under simulation state or sync checks to display connection dots
                const isAppConnected = app.connected || isSimulated;

                return (
                  <div
                    key={app.id}
                    onClick={handleNavigateToIntegrations}
                    className="group relative rounded-2xl border border-black/[0.05] dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] p-4 flex flex-col items-center justify-center text-center transition duration-300 cursor-pointer"
                  >
                    {/* Connected status dot indicator */}
                    {isAppConnected && (
                      <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-emerald-500 border border-white dark:border-[#090d1a] flex items-center justify-center text-white text-[8px] font-bold shadow-sm animate-pulse">
                        ✓
                      </span>
                    )}
                    <div className="mb-2 group-hover:scale-105 transition-transform duration-300">
                      {LogoComponent}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{app.name}</h4>
                    <span className={`text-[10px] font-semibold mt-1 ${isAppConnected ? "text-emerald-500" : "text-slate-500"}`}>
                      {isAppConnected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority Items Card */}
        <div className="glass-premium p-6 rounded-3xl border border-black/[0.05] dark:border-white/5 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.05] dark:border-white/5 pb-4">
              <div className="flex items-start space-x-2.5">
                <Star className="w-5 h-5 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-[13px] font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">Priority Items</h3>
                  {briefData?.generatedAt && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-medium">
                      {format(parseISO(briefData.generatedAt), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push("/dashboard?tab=alerts")}
                className="text-[10px] font-bold text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/[0.05] dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/10 transition flex-shrink-0"
              >
                View all
              </button>
            </div>

            <div className="space-y-4 pt-1">
              {loading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse"></div>
                  <div className="h-12 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse"></div>
                </div>
              ) : priorityItems.length > 0 ? (
                priorityItems.map((item: any, index: number) => {
                  let AppLogo = null;
                  if (item.app?.toLowerCase() === "gmail") {
                    AppLogo = <img src="/001-gmail.png" alt="Gmail" className="w-5 h-5 object-contain" />;
                  } else if (item.app?.toLowerCase() === "slack") {
                    AppLogo = <img src="/005-slack.png" alt="Slack" className="w-5 h-5 object-contain" />;
                  } else if (item.app?.toLowerCase() === "calendar" || item.app?.toLowerCase() === "outlook") {
                    AppLogo = (
                      <svg viewBox="0 0 48 48" className="w-5 h-5 object-contain">
                        <rect x="4" y="4" width="40" height="40" rx="8" fill="#4285F4" />
                        <rect x="10" y="14" width="28" height="24" rx="4" fill="#FFFFFF" />
                        <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill="#4285F4" fontSize="16" fontWeight="bold">31</text>
                      </svg>
                    );
                  } else {
                    AppLogo = getAppIcon(item.app);
                  }

                  return (
                    <div key={item.id || index} className="flex items-center justify-between group p-1.5 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all">
                      <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2">
                        <div className="w-9 h-9 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                          {AppLogo}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug truncate">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 capitalize block mt-0.5">{item.app}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">
                          {(() => {
                            if (!item.time) return null;
                            try {
                              const parsed = parseISO(item.time);
                              if (isValid(parsed)) return format(parsed, "h:mm a");
                            } catch { }
                            return item.time;
                          })()}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${item.priority === "High"
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                          : item.priority === "Medium"
                            ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            : "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                          } animate-pulse`}></span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <div className="flex items-center justify-between group p-1.5 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2">
                      <div className="w-9 h-9 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <img src="/001-gmail.png" alt="Gmail" className="w-5 h-5 object-contain" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug truncate">
                          Q2 Review Deck Feedback
                        </h4>
                        <span className="text-[10px] text-slate-500 capitalize block mt-0.5">Gmail</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium">09:15 AM</span>
                      <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)] animate-pulse"></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between group p-1.5 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2">
                      <div className="w-9 h-9 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <img src="/005-slack.png" alt="Slack" className="w-5 h-5 object-contain" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug truncate">
                          Design Sync Meeting
                        </h4>
                        <span className="text-[10px] text-slate-500 capitalize block mt-0.5">Slack</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium">10:30 AM</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse"></span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between group p-1.5 rounded-2xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-all">
                    <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-2">
                      <div className="w-9 h-9 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/5 flex items-center justify-center p-1.5 flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <svg viewBox="0 0 48 48" className="w-5 h-5 object-contain">
                          <rect x="4" y="4" width="40" height="40" rx="8" fill="#4285F4" />
                          <rect x="10" y="14" width="28" height="24" rx="4" fill="#FFFFFF" />
                          <text x="50%" y="68%" textAnchor="middle" dominantBaseline="middle" fill="#4285F4" fontSize="16" fontWeight="bold">31</text>
                        </svg>
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug truncate">
                          Client Call - Acme Corp
                        </h4>
                        <span className="text-[10px] text-slate-500 capitalize block mt-0.5">Calendar</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400 font-medium">02:00 PM</span>
                      <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse"></span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Chat / Ask Bar */}
      <div className="relative w-full rounded-3xl border border-black/[0.05] dark:border-white/5 bg-white/60 dark:bg-[#0f172a]/40 backdrop-blur-md focus-within:border-purple-500/30 focus-within:shadow-md transition-all duration-300 p-3.5 flex items-center justify-between shadow-sm group mt-8">
        <div className="flex items-center space-x-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5 animate-pulse" />
          </div>
          <input
            type="text"
            placeholder="How can I help you today?"
            className="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-0 ml-3"
          />
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition">
            <Mic className="w-4.5 h-4.5" />
          </button>
          <button className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-blue-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 hover:scale-105 transition duration-300">
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   AI AGENT PANEL (Interactive mini chat)
   ========================================== */
function AiAgentPanel({ user }: { user: any }) {
  const [messages, setMessages] = useState<Array<{
    sender: "user" | "agent";
    text: string;
    isStreaming?: boolean;
    suggestions?: string[];
  }>>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefData, setBriefData] = useState<any>(null);
  const [loadingBrief, setLoadingBrief] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 1. Expiration & Storage (TTL: 1 Day)
  useEffect(() => {
    const stored = localStorage.getItem("omnisync_chat_history");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.updatedAt < oneDayMs) {
          setMessages(parsed.messages);
        } else {
          localStorage.removeItem("omnisync_chat_history");
        }
      } catch (e) {
        console.error("Failed to restore history", e);
      }
    } else {
      // Default initial message
      setMessages([
        {
          sender: "agent",
          text: "Hello! I am your OmniSync cognitive personal assistant. I monitor your connected Gmail, WhatsApp, and Telegram in real-time. Ask me to draft email replies, fetch summaries, or list your action items."
        }
      ]);
    }
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        "omnisync_chat_history",
        JSON.stringify({
          updatedAt: Date.now(),
          messages
        })
      );
    }
  }, [messages]);

  // 2. Fetch Recent Summary updates
  useEffect(() => {
    if (user?.id) {
      fetch("/api/dashboard-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      })
        .then(res => res.json())
        .then(data => {
          setBriefData(data);
          setLoadingBrief(false);
        })
        .catch(err => {
          console.error("Error loading brief data", err);
          setLoadingBrief(false);
        });
    }
  }, [user?.id]);

  // 3. Typing Effect streaming emulator
  const streamMessage = (fullText: string, suggestions: string[] = []) => {
    setLoading(false);
    setMessages((prev) => [
      ...prev,
      { sender: "agent", text: "", isStreaming: true, suggestions }
    ]);

    let currentText = "";
    let index = 0;
    const interval = setInterval(() => {
      if (index < fullText.length) {
        currentText += fullText.slice(index, index + 4);
        index += 4;
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.sender === "agent") {
            last.text = currentText;
          }
          return next;
        });
      } else {
        clearInterval(interval);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.sender === "agent") {
            last.isStreaming = false;
          }
          return next;
        });
      }
    }, 15);
  };

  const executeSend = async (userText: string) => {
    setMessages((prev) => [...prev, { sender: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          prompt: userText,
          history: messages.slice(-10) // Send last 10 messages for conversational context
        })
      });

      if (res.ok) {
        const data = await res.json();
        streamMessage(data.response, data.suggestions || []);
      } else {
        const errorText = await res.text();
        console.error("Chat error:", errorText);
        setLoading(false);
        setMessages((prev) => [
          ...prev,
          { sender: "agent", text: "Sorry, I encountered an issue querying the Gemini engine. Please try again." }
        ]);
      }
    } catch (err) {
      console.error("Error calling chat:", err);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { sender: "agent", text: "Connection error. Make sure the backend server is running." }
      ]);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userText = input;
    setInput("");
    executeSend(userText);
  };

  const handleSuggestionClick = (suggestionText: string) => {
    if (loading) return;
    executeSend(suggestionText);
  };

  const startNewConversation = () => {
    if (window.confirm("Are you sure you want to start a new conversation? This will clear the current chat history.")) {
      const initial = [
        {
          sender: "agent" as const,
          text: "Hello! I am your OmniSync cognitive personal assistant. I monitor your connected Gmail, WhatsApp, and Telegram in real-time. Ask me to draft email replies, fetch summaries, or list your action items."
        }
      ];
      setMessages(initial);
      localStorage.setItem(
        "omnisync_chat_history",
        JSON.stringify({
          updatedAt: Date.now(),
          messages: initial
        })
      );
    }
  };

  const quickSuggestions = [
    { text: "Summarize my emails from today", icon: Mail, bg: "bg-blue-500/10 text-blue-500" },
    { text: "Check pending WhatsApp messages", icon: MessageSquare, bg: "bg-emerald-500/10 text-emerald-500" },
    { text: "Draft a reply to Sarah's email", icon: FileText, bg: "bg-purple-500/10 text-purple-500" },
    { text: "What are my priority action items?", icon: Star, bg: "bg-amber-500/10 text-amber-500" }
  ];

  const appLogos: Record<string, string> = {
    gmail: "/001-gmail.png",
    whatsapp: "/002-whatsapp.png",
    slack: "/005-slack.png",
    outlook: "/003-email.png",
    telegram: "/004-telegram.png",
    discord: "/006-discord.png",
    linkedin: "/007-linkedin.png"
  };

  const getAppIcon = (app: string) => {
    const key = app.toLowerCase();
    return appLogos[key] ? (
      <img src={appLogos[key]} alt={app} className="w-4 h-4 object-contain" />
    ) : (
      <Globe className="w-4 h-4 text-slate-400" />
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Top Recent Summary Section ── */}
      {/* <div className="glass-premium p-5 rounded-3xl border border-black/[0.05] dark:border-white/5 shadow-sm">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-650 dark:text-slate-350">Recent Summary updates</h4>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold bg-black/[0.03] dark:bg-white/5 px-2.5 py-1 rounded-full border border-black/[0.04] dark:border-white/5">
            Connected platforms
          </span>
        </div>

        {loadingBrief ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-black/5 dark:bg-white/5 rounded-2xl animate-pulse border border-black/[0.02] dark:border-white/[0.02]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {briefData?.brief && briefData.brief.length > 0 ? (
              briefData.brief.map((item: any) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl border border-black/[0.03] dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-start space-x-2.5 hover:border-black/10 dark:hover:border-white/10 transition duration-300"
                >
                  <div className="w-7 h-7 rounded-lg bg-black/[0.02] dark:bg-white/5 flex items-center justify-center p-1 flex-shrink-0">
                    {getAppIcon(item.app)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">{item.title}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.summary}</p>
                  </div>
                </div>
              ))
            ) : (
              // Simulated Fallback Items
              <>
                <div className="p-3 rounded-2xl border border-black/[0.03] dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-start space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black/[0.02] dark:bg-white/5 flex items-center justify-center p-1 flex-shrink-0">
                    <img src="/001-gmail.png" alt="Gmail" className="w-4 h-4 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">Q2 Budget Review</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">Sarah requested 10% budget increase feedback.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-black/[0.03] dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-start space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black/[0.02] dark:bg-white/5 flex items-center justify-center p-1 flex-shrink-0">
                    <img src="/002-whatsapp.png" alt="WhatsApp" className="w-4 h-4 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">Roadmap Coffee Sync</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">Alex requested sync tomorrow 4:30 PM.</p>
                  </div>
                </div>

                <div className="p-3 rounded-2xl border border-black/[0.03] dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] flex items-start space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-black/[0.02] dark:bg-white/5 flex items-center justify-center p-1 flex-shrink-0">
                    <img src="/005-slack.png" alt="Slack" className="w-4 h-4 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-snug">Team Stand-Up Alert</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">Engineering stand-up scheduled in 30m.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div> */}

      {/* ── Main Chat Layout Area ── */}
      <div className="h-[85vh] flex flex-col bg-white dark:bg-[#090d1a] border border-black/[0.05] dark:border-white/5 rounded-3xl overflow-hidden shadow-xl">
        {/* Panel Header */}
        <div className="px-6 py-4 bg-slate-50/50 dark:bg-white/[0.01] border-b border-black/[0.05] dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-md shadow-purple-600/25">
              <Sparkles className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white leading-tight">OmniSync Intelligent Agent</h3>
              <p className="text-[10px] text-emerald-500 font-bold flex items-center mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Connected to Gmail & WhatsApp
              </p>
            </div>
          </div>

          <button
            onClick={startNewConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition border border-rose-500/10"
            title="Start fresh conversation"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Messages viewport */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Quick Suggestions (Only show if history contains only the welcome message) */}
          {messages.length <= 1 && (
            <div className="space-y-3 pt-2">
              <p className="text-xs font-semibold text-slate-450 dark:text-slate-500">Suggested Prompts:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {quickSuggestions.map((sug, i) => {
                  const SugIcon = sug.icon;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(sug.text)}
                      className="text-left p-3.5 rounded-2xl border border-black/[0.05] dark:border-white/5 bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.03] dark:hover:bg-white/[0.03] hover:scale-[1.01] active:scale-[0.99] transition duration-300 group flex items-start gap-3.5"
                    >
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${sug.bg} flex-shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                        <SugIcon className="w-4.5 h-4.5" />
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-350 leading-snug group-hover:text-purple-500 transition-colors">
                        {sug.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="h-px bg-black/[0.05] dark:bg-white/5 my-6" />
            </div>
          )}

          {/* Render Messages */}
          {messages.map((m, idx) => {
            const hasAppLogoRef = (text: string) => {
              const lower = text.toLowerCase();
              return Object.keys(appLogos).filter(app => lower.includes(app));
            };
            const appsMentioned = hasAppLogoRef(m.text);

            return (
              <div key={idx} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[85%] p-4 rounded-3xl shadow-sm text-sm leading-relaxed ${m.sender === "user"
                  ? "bg-gradient-to-tr from-purple-600 to-indigo-650 text-white rounded-br-none shadow-md shadow-indigo-950/20"
                  : "bg-slate-50 dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/5 text-slate-700 dark:text-slate-300 rounded-bl-none"
                  }`}>
                  {m.sender === "user" ? (
                    <div className="whitespace-pre-line text-xs sm:text-sm font-semibold">{m.text}</div>
                  ) : (
                    <SafeMarkdown content={m.text} />
                  )}

                  {/* Inline Platforms Tag Bar inside AI message bubbles */}
                  {m.sender === "agent" && appsMentioned.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-black/[0.04] dark:border-white/5 text-[10px] text-slate-400 font-bold">
                      <span>Ref:</span>
                      {appsMentioned.map((app) => (
                        <span key={app} className="inline-flex items-center gap-1 bg-black/[0.03] dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/5 px-2 py-0.5 rounded-full capitalize">
                          <img src={appLogos[app]} alt={app} className="w-3 h-3 object-contain" />
                          {app}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Suggestion replies inside AI bubble */}
                {m.sender === "agent" && m.suggestions && m.suggestions.length > 0 && !m.isStreaming && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                    {m.suggestions.map((suggestion, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-3 py-1.5 text-xs font-bold rounded-full border border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10 text-purple-600 dark:text-purple-400 transition"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Thinking / Loading indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-xl bg-purple-100 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm flex-shrink-0 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div className="bg-slate-50 dark:bg-white/[0.01] border border-black/[0.04] dark:border-white/5 rounded-3xl rounded-tl-none p-4 max-w-[70%] shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500 dark:bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-2 font-bold tracking-wide uppercase">Connecting platforms sync...</p>
              </div>
            </div>
          )}

          {/* Scroll anchor */}
          <div ref={chatEndRef} />
        </div>

        {/* Input box form */}
        <form onSubmit={handleSend} className="p-4 bg-slate-50/50 dark:bg-[#070b17]/40 border-t border-black/[0.05] dark:border-white/5 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask AI Agent to check alerts, draft emails, or search chat logs..."
            className="flex-1 bg-white dark:bg-[#030712] border border-black/[0.06] dark:border-white/5 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-800 dark:text-white placeholder-slate-450 dark:placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="px-4 py-3 bg-purple-650 hover:bg-purple-600 disabled:bg-purple-800/20 text-white rounded-2xl flex items-center justify-center transition shadow-md shadow-purple-500/10 cursor-pointer"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {/* Mini custom Markdown and Platform Icon renderer helper definition */}
      <CustomMarkdownComponents />
    </div>
  );
}

// ─── Inline Markdown Components ───
function CustomMarkdownComponents() {
  return null;
}

// Custom Renderer helpers for Markdown formatting
function renderInlineMarkdown(text: string) {
  const parseInlineLogos = (str: string, keyPrefix: string): React.ReactNode[] => {
    const regex = /(gmail|whatsapp|slack|outlook|telegram|discord|linkedin)/gi;
    const tokens = str.split(regex);
    if (tokens.length <= 1) return [str];

    const logoMap: Record<string, string> = {
      gmail: "/001-gmail.png",
      whatsapp: "/002-whatsapp.png",
      slack: "/005-slack.png",
      outlook: "/003-email.png",
      telegram: "/004-telegram.png",
      discord: "/006-discord.png",
      linkedin: "/007-linkedin.png"
    };

    return tokens.map((tok, index) => {
      const lower = tok.toLowerCase();
      if (logoMap[lower]) {
        return (
          <span key={`${keyPrefix}-${index}`} className="inline-flex items-center gap-1.5 bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.05] dark:border-white/10 px-2 py-0.5 rounded-lg text-[13px] font-bold text-slate-800 dark:text-slate-250 mx-0.5 shadow-sm">
            <img src={logoMap[lower]} alt={tok} className="w-3.5 h-3.5 object-contain flex-shrink-0" />
            {tok}
          </span>
        );
      }
      return tok;
    });
  };

  let elements: React.ReactNode[] = [text];

  // Bold **text**
  elements = elements.flatMap((el, elIdx) => {
    if (typeof el !== "string") return el;
    const parts = el.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, partIdx) => {
      if (partIdx % 2 === 1) {
        return <strong key={`bold-${elIdx}-${partIdx}`} className="font-extrabold text-slate-900 dark:text-white">{part}</strong>;
      }
      return part;
    });
  });

  // Italic *text*
  elements = elements.flatMap((el, elIdx) => {
    if (typeof el !== "string") return el;
    const parts = el.split(/\*([^*]+)\*/g);
    return parts.map((part, partIdx) => {
      if (partIdx % 2 === 1) {
        return <em key={`italic-${elIdx}-${partIdx}`} className="italic text-slate-800 dark:text-slate-200">{part}</em>;
      }
      return part;
    });
  });

  // Links [text](url)
  elements = elements.flatMap((el, elIdx) => {
    if (typeof el !== "string") return el;
    const parts = el.split(/\[([^\]]+)\]\(([^)]+)\)/g);
    if (parts.length <= 1) return el;

    const nodes: React.ReactNode[] = [];
    for (let i = 0; i < parts.length; i += 3) {
      nodes.push(parts[i]);
      if (i + 1 < parts.length) {
        const linkText = parts[i + 1];
        const url = parts[i + 2];
        nodes.push(
          <a
            key={`link-${elIdx}-${i}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-500 dark:text-purple-400 font-bold underline inline-flex items-center gap-0.5 hover:text-purple-400 dark:hover:text-purple-300"
          >
            {linkText}
          </a>
        );
      }
    }
    return nodes;
  });

  // Inline platform logo render
  elements = elements.flatMap((el, elIdx) => {
    if (typeof el !== "string") return el;
    return parseInlineLogos(el, `logo-${elIdx}`);
  });

  return <>{elements}</>;
}

function SafeMarkdown({ content }: { content: string }) {
  if (!content) return null;

  const parts: React.ReactNode[] = [];
  const lines = content.split("\n");

  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = "";

  let inTable = false;
  let tableHeader: string[] = [];
  let tableRows: string[][] = [];

  let inList = false;
  let isOrderedList = false;
  let listItems: string[] = [];

  const flushList = (key: string) => {
    if (listItems.length === 0) return;
    const ListTag = isOrderedList ? "ol" : "ul";
    parts.push(
      <ListTag key={key} className={isOrderedList ? "list-decimal pl-6 my-2 space-y-1.5" : "list-disc pl-6 my-2 space-y-1.5"}>
        {listItems.map((item, i) => (
          <li key={i} className="text-sm text-slate-705 dark:text-slate-300">
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ListTag>
    );
    listItems = [];
    inList = false;
  };

  const flushTable = (key: string) => {
    if (tableHeader.length === 0 && tableRows.length === 0) return;
    parts.push(
      <div key={key} className="overflow-x-auto my-3 border border-black/[0.05] dark:border-white/10 rounded-2xl shadow-sm">
        <table className="min-w-full divide-y divide-black/[0.05] dark:divide-white/10 text-xs sm:text-sm">
          {tableHeader.length > 0 && (
            <thead className="bg-slate-50 dark:bg-white/[0.02]">
              <tr>
                {tableHeader.map((th, i) => (
                  <th key={i} className="px-4 py-2 text-left font-bold text-slate-700 dark:text-slate-200">
                    {renderInlineMarkdown(th)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.04] bg-white/20 dark:bg-[#070b17]/25">
            {tableRows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2 text-slate-600 dark:text-slate-300">
                    {renderInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableHeader = [];
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeLines.join("\n");
        const key = `code-${i}`;
        parts.push(
          <div key={key} className="relative group my-3.5 rounded-2xl overflow-hidden bg-[#0d111d] border border-white/5 text-slate-200 font-mono text-xs shadow-md">
            <div className="flex items-center justify-between px-4 py-2 bg-[#080b13] border-b border-white/[0.06] text-[10px] uppercase font-bold tracking-wider text-slate-400">
              <span>{codeLang || "code"}</span>
              <button
                onClick={() => navigator.clipboard.writeText(codeText)}
                className="hover:text-white transition flex items-center gap-1.5 cursor-pointer text-slate-500 font-bold"
                title="Copy code"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.replace("```", "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.trim().startsWith("|")) {
      const cleanLine = line.trim();
      if (cleanLine.includes("-") && cleanLine.replace(/[|:\-\s]/g, "") === "") {
        continue;
      }
      const cells = line.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
      if (!inTable) {
        flushList(`list-before-table-${i}`);
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(`table-${i}`);
    }

    const unorderedMatch = line.match(/^[\s]*[\-*]\s+(.*)/);
    const orderedMatch = line.match(/^[\s]*\d+\.\s+(.*)/);

    if (unorderedMatch || orderedMatch) {
      const matchText = unorderedMatch ? unorderedMatch[1] : orderedMatch![1];
      const isCurrentOrdered = !!orderedMatch;

      if (!inList || isOrderedList !== isCurrentOrdered) {
        flushList(`list-${i}`);
        inList = true;
        isOrderedList = isCurrentOrdered;
      }
      listItems.push(matchText);
      continue;
    } else if (inList) {
      flushList(`list-${i}`);
    }

    if (line.startsWith("### ")) {
      parts.push(
        <h4 key={i} className="text-base font-bold text-slate-900 dark:text-white mt-4 mb-2">
          {renderInlineMarkdown(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      parts.push(
        <h3 key={i} className="text-lg font-extrabold text-slate-900 dark:text-white mt-5 mb-2.5">
          {renderInlineMarkdown(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      parts.push(
        <h2 key={i} className="text-xl font-black text-slate-900 dark:text-white mt-6 mb-3">
          {renderInlineMarkdown(line.slice(2))}
        </h2>
      );
      continue;
    }

    if (line.trim()) {
      parts.push(
        <p key={i} className="text-sm text-slate-700 dark:text-slate-300 my-2.5 leading-relaxed">
          {renderInlineMarkdown(line)}
        </p>
      );
    }
  }

  flushList("list-end");
  flushTable("table-end");

  return <div className="space-y-1">{parts}</div>;
}


/* ==========================================
   BRIEFING PANEL
   ========================================== */
function BriefingPanel() {
  const { user } = useAuth();
  const router = useRouter();
  const [briefings, setBriefings] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Create dialog form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    apps: [] as string[],
    categories: [] as string[],
    scheduledTime: "09:00",
    frequency: "daily",
    priorityLevel: "medium"
  });

  const [regenError, setRegenError] = useState("");

  const availableApps = [
    { key: "gmail", label: "Gmail", logo: "/001-gmail.png" },
    { key: "whatsapp", label: "WhatsApp", logo: "/002-whatsapp.png" },
    { key: "slack", label: "Slack", logo: "/005-slack.png" },
    { key: "telegram", label: "Telegram", logo: "/004-telegram.png" },
  ];

  const connectedApps: Record<string, boolean> = {
    gmail: !!(user as any)?.integrations?.gmail?.connected,
    whatsapp: !!(user as any)?.integrations?.whatsapp?.connected,
    slack: !!(user as any)?.integrations?.slack?.connected,
    telegram: !!(user as any)?.integrations?.telegram?.connected,
  };
  const availableCategories = ["email", "messages", "mentions", "tasks", "follow_ups"];
  const categoryLabels: Record<string, string> = {
    email: "Email", messages: "Messages", mentions: "Mentions", tasks: "Tasks", follow_ups: "Follow-Ups"
  };
  const categoryIcons: Record<string, any> = {
    email: Mail, messages: MessageSquare, mentions: AtSign, tasks: CheckCircle, follow_ups: ArrowRight
  };
  const categoryColors: Record<string, string> = {
    email: "text-blue-400", messages: "text-emerald-400", mentions: "text-violet-400", tasks: "text-amber-400", follow_ups: "text-rose-400"
  };
  const categoryBg: Record<string, string> = {
    email: "bg-blue-500/10 border-blue-500/20", messages: "bg-emerald-500/10 border-emerald-500/20",
    mentions: "bg-violet-500/10 border-violet-500/20", tasks: "bg-amber-500/10 border-amber-500/20",
    follow_ups: "bg-rose-500/10 border-rose-500/20"
  };

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [briefRes, schedRes] = await Promise.all([
        fetch(`/api/briefings?userId=${user.id}`),
        fetch(`/api/briefings/schedules?userId=${user.id}`)
      ]);
      if (briefRes.ok) setBriefings(await briefRes.json());
      if (schedRes.ok) setSchedules(await schedRes.json());
    } catch (e) {
      console.error("Failed to fetch briefing data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleRegenerate = async () => {
    if (!user || regenerating) return;
    setRegenerating(true);
    setRegenError("");
    try {
      const res = await fetch("/api/briefings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id })
      });
      const body = await res.json();
      if (res.ok) {
        await fetchData();
      } else {
        setRegenError(body.error || "Failed to generate briefing.");
      }
    } catch (e) {
      console.error("Failed to regenerate briefing:", e);
      setRegenError("Network error. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || creating) return;
    const validApps = form.apps.filter(a => connectedApps[a]);
    if (validApps.length === 0) {
      alert("Please select at least one connected app.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/briefings/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: form.name,
          description: form.description,
          apps: validApps,
          categories: form.categories,
          scheduledTime: form.scheduledTime,
          frequency: form.frequency,
          priorityLevel: form.priorityLevel
        })
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setForm({ name: "", description: "", apps: [], categories: [], scheduledTime: "09:00", frequency: "daily", priorityLevel: "medium" });
        await fetchData();
      }
    } catch (e) {
      console.error("Failed to create schedule:", e);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    try {
      await fetch(`/api/briefings/schedules?userId=${user.id}&id=${id}`, { method: "DELETE" });
      await fetchData();
    } catch (e) {
      console.error("Failed to delete schedule:", e);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleArrayItem = (arr: string[], item: string): string[] =>
    arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];

  const latestBriefing = briefings[0] || null;
  const historicalBriefings = briefings.slice(1);

  const priorityBadge: Record<string, string> = {
    high: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    low: "bg-blue-500/20 text-blue-400 border-blue-500/30"
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Intelligence Briefing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Daily digests generated from all your connected platforms.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
            {regenerating ? "Generating…" : "Regenerate"}
          </button>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Custom Briefing
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />)}
          </div>
        </div>
      ) : (
        <>
          {regenError && (
            <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              <span className="font-bold flex-shrink-0">⚠</span>
              <span>{regenError} {regenError.includes("connect") && <a href="/dashboard" className="underline ml-1 font-semibold">Go to Integrations</a>}</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ── COLUMN 1: Today's Briefing ── */}
            <div>
              {latestBriefing ? (
                <div className="bg-white dark:bg-[#0d111e]/40 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                  {/* Executive Summary Card Header */}
                  <div
                    className="relative overflow-hidden border-b border-slate-200 dark:border-white/10 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent dark:from-indigo-900/30 dark:via-purple-900/10 dark:to-transparent p-5 cursor-pointer group transition-all duration-300"
                    onClick={() => router.push(`/dashboard/briefing/${latestBriefing.id}`)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                          <Sparkles className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400">Today's Briefing</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                          {latestBriefing.created_at ? format(parseISO(latestBriefing.created_at), "MMM d, h:mm a") : ""}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-400 transition">{latestBriefing.title}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3 mb-3">{latestBriefing.summary}</p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 group-hover:underline">
                        Open briefing details <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>

                  {/* Highlights Feed List */}
                  <div className="p-5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Highlights Feed</h3>

                    {(() => {
                      const allBriefingItems: any[] = [];
                      if (latestBriefing?.data) {
                        const data = latestBriefing.data;
                        if (data.email) data.email.forEach((item: any) => allBriefingItems.push({ ...item, categoryKey: "email" }));
                        if (data.messages) data.messages.forEach((item: any) => allBriefingItems.push({ ...item, categoryKey: "messages" }));
                        if (data.mentions) data.mentions.forEach((item: any) => allBriefingItems.push({ ...item, categoryKey: "mentions" }));
                        if (data.tasks) data.tasks.forEach((item: any) => allBriefingItems.push({ ...item, categoryKey: "tasks" }));
                        if (data.follow_ups) data.follow_ups.forEach((item: any) => allBriefingItems.push({ ...item, categoryKey: "follow_ups" }));
                      }

                      if (allBriefingItems.length === 0) {
                        return (
                          <div className="text-center py-8 text-xs text-slate-400">
                            No items found in today's briefing.
                          </div>
                        );
                      }

                      return (
                        <div className="divide-y divide-slate-100 dark:divide-white/[0.05] max-h-[350px] overflow-y-auto pr-1 space-y-3.5">
                          {allBriefingItems.slice(0, 5).map((item, idx) => {
                            const catIcon = categoryIcons[item.categoryKey] || Mail;
                            const catColor = categoryColors[item.categoryKey] || "text-blue-400";
                            const catBg = categoryBg[item.categoryKey] || "bg-blue-500/10 border-blue-500/20";
                            const itemTitle = item.title || item.subject || (item.categoryKey === "messages" ? `Message from ${item.from}` : item.from) || "Untitled Alert";
                            const itemSnippet = item.snippet || item.description || "";
                            const itemApp = item.app || "system";
                            const appSrc = availableApps.find(a => a.key === itemApp.toLowerCase())?.logo;

                            return (
                              <div
                                key={idx}
                                onClick={() => router.push(`/dashboard/briefing/${latestBriefing.id}?category=${item.categoryKey}`)}
                                className="pt-3.5 first:pt-0 group cursor-pointer flex items-start gap-3.5 text-left"
                              >
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-center flex-shrink-0 relative">
                                  {appSrc ? (
                                    <img src={appSrc} alt={itemApp} className="w-4.5 h-4.5 object-contain" />
                                  ) : (
                                    <FileText className="w-4.5 h-4.5 text-slate-400" />
                                  )}
                                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-white dark:border-[#0d111e] flex items-center justify-center ${catBg}`}>
                                    {React.createElement(catIcon, { className: `w-2 h-2 ${catColor}` })}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-white truncate group-hover:text-indigo-400 dark:group-hover:text-indigo-400 transition">{itemTitle}</h4>
                                    <span className="text-[10px] text-slate-400 flex-shrink-0">{item.time}</span>
                                  </div>
                                  {item.from && item.from !== itemTitle && (
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.from}</p>
                                  )}
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-normal">{itemSnippet}</p>
                                </div>
                              </div>
                            );
                          })}
                          {allBriefingItems.length > 5 && (
                            <button
                              onClick={() => router.push(`/dashboard/briefing/${latestBriefing.id}`)}
                              className="w-full text-center pt-3 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition"
                            >
                              View all {allBriefingItems.length} items →
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">No briefings yet</h3>
                  <p className="text-xs text-slate-400 mb-4">Click "Regenerate" to generate your first briefing from connected apps.</p>
                  <button
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition disabled:opacity-50"
                  >
                    {regenerating ? "Generating…" : "Generate Now"}
                  </button>
                </div>
              )}
            </div>

            {/* ── COLUMN 2: Category List ── */}
            <div>
              {latestBriefing && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d111e]/40 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Category list</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Explore sections in detail</p>
                  </div>
                  <div className="space-y-3">
                    {availableCategories.map(cat => {
                      const Icon = categoryIcons[cat] || Mail;
                      const count = latestBriefing.stats?.[cat] ?? 0;
                      const items = latestBriefing.data?.[cat] ?? [];
                      const firstItem = items[0];
                      const firstItemText = firstItem
                        ? (firstItem.title || firstItem.subject || firstItem.description || firstItem.snippet || "View details")
                        : count === 0 ? "No updates" : "View details";

                      return (
                        <div
                          key={cat}
                          onClick={() => router.push(`/dashboard/briefing/${latestBriefing.id}?category=${cat}`)}
                          className={`group relative p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${categoryBg[cat]}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${categoryColors[cat]}`} />
                              <span className="text-xs font-bold text-slate-800 dark:text-white">{categoryLabels[cat]}</span>
                            </div>
                            {count > 0 && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 dark:bg-black/20 ${categoryColors[cat]}`}>
                                {count}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2 pr-2">
                            {firstItemText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── COLUMN 3: Custom Briefing Section ── */}
            <div className="space-y-6">
              {/* Custom Schedules */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d111e]/40 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Custom Briefing</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Automated briefing timing</p>
                  </div>
                  <button
                    onClick={() => setShowCreateDialog(true)}
                    className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-indigo-400 transition"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {schedules.length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                    No custom schedules yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedules.map(s => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] group hover:border-slate-300 dark:hover:border-white/10 transition">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${priorityBadge[s.priority_level]}`}>
                            <Calendar className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-white truncate">{s.name}</p>
                            <p className="text-[9px] text-slate-400 truncate">
                              {s.frequency} @ {s.scheduled_time}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleDeleteSchedule(s.id)}
                            disabled={deletingId === s.id}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Past Briefings */}
              {historicalBriefings.length > 0 && (
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0d111e]/40 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Past Briefings</h3>
                  <div className="space-y-2">
                    {historicalBriefings.slice(0, 5).map(b => (
                      <div
                        key={b.id}
                        onClick={() => router.push(`/dashboard/briefing/${b.id}`)}
                        className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] cursor-pointer group hover:border-slate-200 dark:hover:border-white/10 transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-slate-900 dark:group-hover:text-white transition">{b.title}</p>
                            <p className="text-[9px] text-slate-400">
                              {b.created_at ? format(parseISO(b.created_at), "MMM d, yyyy") : ""}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Create Custom Briefing Dialog ── */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)} />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0d111e] rounded-2xl border border-slate-200 dark:border-white/10 shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#0d111e] z-10 rounded-t-2xl">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Create Custom Briefing</h3>
                <p className="text-xs text-slate-400 mt-0.5">Schedule personalized AI-generated briefings</p>
              </div>
              <button onClick={() => setShowCreateDialog(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateSchedule} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Briefing Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Morning Work Digest"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Description / Goal</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Summarize work emails and messages from the team each morning..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition resize-none"
                />
              </div>

              {/* Apps */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Connected Apps</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableApps.map(({ key, label, logo }) => {
                    const isConnected = !!connectedApps[key];
                    const isSelected = form.apps.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!isConnected}
                        onClick={() => isConnected && setForm(f => ({ ...f, apps: toggleArrayItem(f.apps, key) }))}
                        title={!isConnected ? `${label} is not connected. Connect it from Integrations.` : label}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${!isConnected
                          ? "opacity-40 cursor-not-allowed bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/[0.06] text-slate-400"
                          : isSelected
                            ? "bg-indigo-500 border-indigo-500 text-white"
                            : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                          }`}
                      >
                        <img src={logo} alt={label} className="w-4 h-4 object-contain flex-shrink-0" />
                        <span className="flex-1 text-left">{label}</span>
                        {!isConnected && (
                          <span className="text-[9px] font-bold uppercase tracking-wider opacity-60">Not connected</span>
                        )}
                        {isConnected && isSelected && (
                          <span className="ml-auto w-3.5 h-3.5 rounded-full bg-white/30 flex items-center justify-center text-[9px]">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {availableApps.every(({ key }) => !connectedApps[key]) && (
                  <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1">
                    ⚠ No apps connected yet. <a href="/dashboard" className="underline font-semibold">Connect from Integrations</a>
                  </p>
                )}
              </div>

              {/* Categories */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2">
                  {availableCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, categories: toggleArrayItem(f.categories, cat) }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${form.categories.includes(cat) ? "bg-purple-500 border-purple-500 text-white" : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-purple-400"}`}
                    >
                      {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time + Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Scheduled Time *</label>
                  <input
                    required
                    type="time"
                    value={form.scheduledTime}
                    onChange={e => setForm(f => ({ ...f, scheduledTime: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">Frequency *</label>
                  <select
                    required
                    value={form.frequency}
                    onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 dark:focus:border-indigo-400 transition"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="hourly">Hourly</option>
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">Priority Level *</label>
                <div className="flex gap-2">
                  {["high", "medium", "low"].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, priorityLevel: level }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize transition ${form.priorityLevel === level ? `${priorityBadge[level]} border-current` : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20"}`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !form.name}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 hover:opacity-90 transition disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Create Briefing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


/* ==========================================
   INTEGRATIONS PANEL
   ========================================== */
interface Platform {
  id: string;
  name: string;
  desc: string;
  logo: string;
  color: string;
  bg: string;
  borderGlow: string;
  badgeBg: string;
}

const PLATFORMS: Platform[] = [
  {
    id: "gmail",
    name: "Gmail",
    desc: "Connect to your inbox, fetch messages, search emails, and compose replies via MCP.",
    logo: "/001-gmail.png",
    color: "text-red-400",
    bg: "from-red-500/10 via-transparent to-red-500/5",
    borderGlow: "group-hover:border-red-500/30",
    badgeBg: "bg-red-500/10 border-red-500/20 text-red-400"
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    desc: "Sync conversations, fetch message logs, and send automated client messages.",
    logo: "/002-whatsapp.png",
    color: "text-emerald-400",
    bg: "from-emerald-500/10 via-transparent to-emerald-500/5",
    borderGlow: "group-hover:border-emerald-500/30",
    badgeBg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
  },
  {
    id: "slack",
    name: "Slack",
    desc: "Post updates to channels, sync workspace history, and notify team members.",
    logo: "/005-slack.png",
    color: "text-purple-400",
    bg: "from-purple-500/10 via-transparent to-purple-500/5",
    borderGlow: "group-hover:border-purple-500/30",
    badgeBg: "bg-purple-500/10 border-purple-500/20 text-purple-400"
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    desc: "Analyze calendar appointments, list inbox, and manage event schedules.",
    logo: "/003-email.png",
    color: "text-blue-400",
    bg: "from-blue-500/10 via-transparent to-blue-500/5",
    borderGlow: "group-hover:border-blue-500/30",
    badgeBg: "bg-blue-500/10 border-blue-500/20 text-blue-400"
  },
  {
    id: "discord",
    name: "Discord",
    desc: "Monitor channel chats, post announcements, and index community servers.",
    logo: "/006-discord.png",
    color: "text-indigo-400",
    bg: "from-indigo-500/10 via-transparent to-indigo-500/5",
    borderGlow: "group-hover:border-indigo-500/30",
    badgeBg: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    desc: "Extract feed updates, post news shares, and manage member profiles.",
    logo: "/007-linkedin.png",
    color: "text-blue-500",
    bg: "from-blue-600/10 via-transparent to-blue-600/5",
    borderGlow: "group-hover:border-blue-600/30",
    badgeBg: "bg-blue-600/10 border-blue-600/20 text-blue-400"
  },
  {
    id: "telegram",
    name: "Telegram",
    desc: "Index channel events, query group chat messages, and send alert notices.",
    logo: "/004-telegram.png",
    color: "text-sky-400",
    bg: "from-sky-500/10 via-transparent to-sky-500/5",
    borderGlow: "group-hover:border-sky-500/30",
    badgeBg: "bg-sky-500/10 border-sky-500/20 text-sky-400"
  },
  {
    id: "custom",
    name: "Other Platforms",
    desc: "Connect to standard webhooks, custom endpoints, and other local MCP gateways.",
    logo: "",
    color: "text-slate-400",
    bg: "from-slate-500/10 via-transparent to-slate-500/5",
    borderGlow: "group-hover:border-slate-500/30",
    badgeBg: "bg-slate-500/10 border-slate-500/20 text-slate-400"
  }
];

const platformTools: Record<string, Array<{ name: string; desc: string; params: string }>> = {
  gmail: [
    { name: "gmail_list_messages", desc: "List messages in the user's mailbox", params: "q?: string, maxResults?: number" },
    { name: "gmail_get_message", desc: "Retrieve a specific message by ID", params: "id: string" },
    { name: "gmail_search_messages", desc: "Search inbox with query string", params: "q: string" },
    { name: "gmail_create_draft", desc: "Create a new draft message", params: "to: string, subject: string, body: string, threadId?: string" },
    { name: "gmail_send_message", desc: "Send an email message", params: "to: string, subject: string, body: string" },
    { name: "gmail_get_thread", desc: "Retrieve a conversation thread by ID", params: "id: string" }
  ],
  whatsapp: [
    { name: "whatsapp_get_recent_messages", desc: "Fetch recent messages across all active chat conversations", params: "" },
    { name: "whatsapp_get_chat_history", desc: "Read chat history for a specific contact or chat JID", params: "chatId: string, limit?: number" },
    { name: "whatsapp_send_message", desc: "Send a text message to a contact JID or phone number", params: "to: string, body: string" },
    { name: "whatsapp_search_chats", desc: "Search chats matching a text query", params: "query: string" },
    { name: "whatsapp_summarize_conversations", desc: "Summarize conversations or a specific chat", params: "chatId?: string" },
    { name: "whatsapp_get_contact_details", desc: "Get contact details for a specific JID or phone number", params: "jidOrPhone: string" },
    { name: "whatsapp_list_groups", desc: "List all active WhatsApp groups the user is in", params: "" },
    { name: "whatsapp_get_group_messages", desc: "Fetch messages from a specific group JID", params: "groupId: string, limit?: number" },
    { name: "whatsapp_send_group_message", desc: "Send a text message to a specific group JID", params: "groupId: string, body: string" }
  ],
  slack: [
    { name: "slack_list_channels", desc: "Retrieve list of channels in the workspace", params: "types?: string[]" },
    { name: "slack_get_history", desc: "Fetch message history from a channel", params: "channelId: string, limit?: number" },
    { name: "slack_post_message", desc: "Post a message to a channel or DM", params: "channelId: string, text: string" }
  ],
  outlook: [
    { name: "outlook_list_messages", desc: "List email messages in the user's inbox", params: "maxResults?: number" },
    { name: "outlook_list_events", desc: "List upcoming calendar events", params: "timeMin?: string, timeMax?: string" },
    { name: "outlook_create_event", desc: "Create a new calendar event", params: "summary: string, start: string, end: string" }
  ],
  discord: [
    { name: "discord_get_guilds", desc: "List all Discord servers joined", params: "" },
    { name: "discord_get_channels", desc: "List channels in a specific server", params: "guildId: string" },
    { name: "discord_post_message", desc: "Post a message to a Discord channel", params: "channelId: string, content: string" }
  ],
  linkedin: [
    { name: "linkedin_get_profile", desc: "Retrieve current member profile info", params: "" },
    { name: "linkedin_post_share", desc: "Create a new share/post on LinkedIn feed", params: "text: string, visibility?: 'public'|'connections'" }
  ],
  telegram: [
    { name: "telegram_get_updates", desc: "Retrieve latest updates and messages", params: "limit?: number" },
    { name: "telegram_send_message", desc: "Send a message to a chat or group", params: "chatId: string, text: string" }
  ],
  custom: [
    { name: "webhook_trigger", desc: "Trigger a webhook endpoint with custom payload", params: "url: string, payload: object" },
    { name: "get_mcp_capabilities", desc: "Get details on all active local MCP gateways", params: "" }
  ]
};

function IntegrationsPanel() {
  const { user, refreshUser } = useAuth();
  const [updatingPlatform, setUpdatingPlatform] = useState<string | null>(null);

  // Settings Dialog States
  const [activeSettingsPlatform, setActiveSettingsPlatform] = useState<Platform | null>(null);

  // Simulated Fallback Error Modal
  const [showGmailSetupErrorModal, setShowGmailSetupErrorModal] = useState(false);

  // WhatsApp Connection States
  const [showWhatsAppConnectModal, setShowWhatsAppConnectModal] = useState(false);
  const [whatsAppPhoneNumber, setWhatsAppPhoneNumber] = useState("");
  const [whatsAppPairingCode, setWhatsAppPairingCode] = useState<string | null>(null);
  const [whatsAppConnectStatus, setWhatsAppConnectStatus] = useState<string | null>(null);
  const [isConnectingWhatsApp, setIsConnectingWhatsApp] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; isExiting?: boolean } | null>(null);

  const showToast = (message: string) => {
    setToast({ message });
  };

  useEffect(() => {
    if (toast && !toast.isExiting) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, isExiting: true } : null);
      }, 3500);
      return () => clearTimeout(timer);
    } else if (toast?.isExiting) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Poll WhatsApp connection status
  useEffect(() => {
    let intervalId: any;
    if (showWhatsAppConnectModal && (whatsAppConnectStatus === "connecting" || whatsAppPairingCode)) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch("/api/whatsapp-connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "status", userId: user?.id })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === "connected") {
              setWhatsAppConnectStatus("connected");
              setWhatsAppPairingCode(null);
              clearInterval(intervalId);
              await refreshUser();
              setShowWhatsAppConnectModal(false);
              showToast("WhatsApp connected successfully!");
            } else if (data.status === "disconnected") {
              setWhatsAppConnectStatus("disconnected");
              setWhatsAppPairingCode(null);
              clearInterval(intervalId);
            } else if (data.pairingCode) {
              setWhatsAppPairingCode(data.pairingCode);
            }
          }
        } catch (e) {
          console.error("Error polling WhatsApp status:", e);
        }
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showWhatsAppConnectModal, whatsAppConnectStatus, whatsAppPairingCode, user, refreshUser]);

  const handleStartConnectWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !whatsAppPhoneNumber.trim()) return;
    setIsConnectingWhatsApp(true);
    setWhatsAppConnectStatus("connecting");
    setWhatsAppPairingCode(null);
    try {
      const res = await fetch("/api/whatsapp-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          userId: user.id,
          phoneNumber: whatsAppPhoneNumber
        })
      });
      if (res.ok) {
        const data = await res.json();
        setWhatsAppConnectStatus(data.status);
        if (data.pairingCode) {
          setWhatsAppPairingCode(data.pairingCode);
        }
      } else {
        setWhatsAppConnectStatus("error");
      }
    } catch (err) {
      console.error("Failed to connect WhatsApp:", err);
      setWhatsAppConnectStatus("error");
    } finally {
      setIsConnectingWhatsApp(false);
    }
  };

  const handleConnectSimulatedWhatsApp = async () => {
    if (!user) return;
    setIsConnectingWhatsApp(true);
    try {
      const res = await fetch("/api/whatsapp-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect-simulated",
          userId: user.id,
          phoneNumber: "+15550199"
        })
      });
      if (res.ok) {
        await refreshUser();
        setShowWhatsAppConnectModal(false);
        showToast("WhatsApp connected successfully!");
      }
    } catch (err) {
      console.error("Failed to connect simulated WhatsApp:", err);
    } finally {
      setIsConnectingWhatsApp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    if (!user) return;
    setUpdatingPlatform("whatsapp");
    try {
      const res = await fetch("/api/whatsapp-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", userId: user.id })
      });
      if (res.ok) {
        await refreshUser();
      }
    } catch (err) {
      console.error("Error disconnecting WhatsApp:", err);
    } finally {
      setUpdatingPlatform(null);
    }
  };

  const handleToggleConnect = async (platformId: string) => {
    if (!user) return;

    if (platformId === "whatsapp") {
      const currentIntegrations = user.integrations || {};
      const isConnected = !!currentIntegrations[platformId]?.connected;
      if (isConnected) {
        await handleDisconnectWhatsApp();
      } else {
        setWhatsAppPhoneNumber("");
        setWhatsAppPairingCode(null);
        setWhatsAppConnectStatus(null);
        setShowWhatsAppConnectModal(true);
      }
      return;
    }

    setUpdatingPlatform(platformId);
    try {
      const currentIntegrations = user.integrations || {};
      const isConnected = !!currentIntegrations[platformId]?.connected;

      if (platformId === "gmail") {
        if (isConnected) {
          // Disconnect Gmail
          const updatedIntegrations = {
            ...currentIntegrations,
            gmail: null
          };
          const { error } = await insforge.database
            .from("users")
            .update({ integrations: updatedIntegrations })
            .eq("id", user.id);

          if (error) {
            console.error("Error disconnecting Gmail:", error);
          } else {
            await refreshUser();
          }
        } else {
          // Check if Client ID is configured in .env
          const res = await fetch("/api/gmail-connect");
          const data = await res.json();

          if (data.clientId && data.clientId !== "your_google_client_id_here") {
            // Redirect to Google OAuth Consent flow!
            const redirectUri = encodeURIComponent("http://localhost:3000/auth/gmail-callback");
            const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${data.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/gmail.modify&access_type=offline&prompt=consent`;
            window.location.assign(googleAuthUrl);
          } else {
            // Client credentials missing in .env. Open warning modal.
            setShowGmailSetupErrorModal(true);
          }
        }
      } else {
        // For other platforms (simulated state toggler)
        const updatedIntegrations = {
          ...currentIntegrations,
          [platformId]: isConnected ? null : { connected: true, isSimulated: true }
        };

        const { error } = await insforge.database
          .from("users")
          .update({ integrations: updatedIntegrations })
          .eq("id", user.id);

        if (error) {
          console.error("Error updating database integration status:", error);
        } else {
          await refreshUser();
        }
      }
    } catch (err) {
      console.error("Failed to sync integration status:", err);
    } finally {
      setUpdatingPlatform(null);
    }
  };

  const handleConnectSimulatedGmail = async () => {
    if (!user) return;
    setShowGmailSetupErrorModal(false);
    setUpdatingPlatform("gmail");
    try {
      const currentIntegrations = user.integrations || {};
      const updatedIntegrations = {
        ...currentIntegrations,
        gmail: {
          connected: true,
          isSimulated: true
        }
      };

      const { error } = await insforge.database
        .from("users")
        .update({ integrations: updatedIntegrations })
        .eq("id", user.id);

      if (error) {
        console.error("Failed to connect simulated Gmail:", error);
      } else {
        await refreshUser();
      }
    } catch (err) {
      console.error("Failed to connect simulated Gmail:", err);
    } finally {
      setUpdatingPlatform(null);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative pb-12">
      <div>
        <h2 className="text-xl md:text-2xl font-extrabold text-white light:text-slate-900 tracking-wide">Cognitive Workspace Integrations</h2>
        <p className="text-xs md:text-sm text-slate-400 light:text-slate-600 mt-1">
          Bridge your communication channels to OmniSync&apos;s background processing model using local and secure MCP configurations.
        </p>
      </div>

      {/* Platforms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PLATFORMS.map((platform) => {
          const isConnected = !!(user?.integrations?.[platform.id]?.connected);
          const isUpdating = updatingPlatform === platform.id;

          return (
            <div
              key={platform.id}
              className="group glass-premium border border-white/5 light:border-slate-200 hover:border-white/10 hover:shadow-lg hover:shadow-purple-900/5 rounded-3xl p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden h-[300px]"
            >
              {/* Card glowing gradient behind */}
              <div className={`absolute inset-0 bg-gradient-to-tr ${platform.bg} opacity-20 pointer-events-none transition duration-300 group-hover:opacity-30`} />

              {/* Status Badge in Top Right */}
              <div className="absolute top-4 right-4 z-10">
                {isConnected ? (
                  <span className="flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold tracking-wide rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 px-2.5 py-1 text-[10px] font-bold tracking-wide rounded-full bg-white/5 border border-white/5 light:border-slate-200 text-slate-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    <span>Disconnected</span>
                  </span>
                )}
              </div>

              {/* Logo / Brand Centered Area */}
              <div className="flex-1 flex flex-col items-center justify-center pt-4 pb-2 z-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] light:bg-slate-50 border border-white/5 light:border-slate-200 flex items-center justify-center p-3.5 mb-3 group-hover:scale-105 transition-transform duration-300 relative shadow-inner">
                  {platform.logo ? (
                    <img src={platform.logo} alt={platform.name} className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-8 h-8 text-slate-400 light:text-slate-500" />
                  )}
                </div>
                <h3 className="text-base font-bold text-white light:text-slate-900 tracking-wide">{platform.name}</h3>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-2 px-4 line-clamp-2 min-h-[32px] leading-relaxed">
                  {platform.desc}
                </p>
              </div>

              {/* Buttons Row */}
              <div className="mt-4 flex space-x-3 z-10">
                {!isConnected ? (
                  <button
                    onClick={() => handleToggleConnect(platform.id)}
                    disabled={isUpdating}
                    className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800/40 disabled:text-slate-500 active:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-900/20 flex items-center justify-center"
                  >
                    {isUpdating ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Connect Integration"
                    )}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleConnect(platform.id)}
                      disabled={isUpdating}
                      className="flex-1 py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center"
                    >
                      {isUpdating ? (
                        <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Disconnect"
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setActiveSettingsPlatform(platform);
                      }}
                      className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 light:border-slate-200 text-slate-300 light:text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                      <span>Settings</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* PREMIUM PLATFORM SETTINGS MODAL */}
      {activeSettingsPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#090d1a] light:bg-white border border-white/10 light:border-slate-200 rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">

            {/* Modal Header */}
            <div className="px-6 py-5 bg-white/[0.01] light:bg-slate-50 border-b border-white/5 light:border-slate-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 light:border-slate-200 flex items-center justify-center p-2 flex-shrink-0 shadow-sm">
                  {activeSettingsPlatform.logo ? (
                    <img src={activeSettingsPlatform.logo} alt={activeSettingsPlatform.name} className="w-full h-full object-contain" />
                  ) : (
                    <Globe className="w-5 h-5 text-slate-400 light:text-slate-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white light:text-slate-900 tracking-wide">{activeSettingsPlatform.name} Settings</h3>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center space-x-1">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      <span>Active Sync</span>
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 light:text-slate-600">Connected via Model Context Protocol (MCP) integrations.</p>
                </div>
              </div>
              <button
                onClick={() => setActiveSettingsPlatform(null)}
                className="p-1.5 rounded-xl hover:bg-white/5 light:hover:bg-slate-100 border border-transparent text-slate-400 hover:text-white light:hover:text-slate-950 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - List of Tools Only */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#030712] light:bg-slate-50">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white light:text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                  <Settings2 className="w-4 h-4 text-purple-400" />
                  <span>Available MCP Tools</span>
                </h4>
                <p className="text-[11px] text-slate-500 light:text-slate-600">
                  The following Model Context Protocol (MCP) tools are exposed by this platform to your OmniSync cognitive personal assistant.
                </p>
              </div>

              <div className="space-y-4">
                {platformTools[activeSettingsPlatform.id]?.map((tool) => (
                  <div
                    key={tool.name}
                    className="p-4 bg-white/[0.01] light:bg-white border border-white/5 light:border-slate-200 rounded-2xl space-y-2.5 hover:border-purple-500/20 light:hover:border-purple-500/30 transition shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-purple-400 light:text-purple-600">{tool.name}</span>
                      <span className="text-[8px] font-mono font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 light:text-purple-600 max-w-max">
                        mcp_tool_schema
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 light:text-slate-700 leading-relaxed">{tool.desc}</p>
                    {tool.params && (
                      <div className="bg-[#030712] light:bg-slate-100 p-2.5 rounded-xl border border-white/5 light:border-slate-200 text-[10px] font-mono text-slate-400 light:text-slate-600">
                        <span className="text-purple-400 light:text-purple-600 font-bold">arguments:</span> &#123; {tool.params} &#125;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* GOOGLE OAUTH CONFIG WARNING MODAL */}
      {showGmailSetupErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#090d1a] light:bg-white border border-white/10 light:border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">
            <div className="flex items-center space-x-3 text-amber-500">
              <AlertCircle className="w-8 h-8 flex-shrink-0" />
              <h3 className="text-base font-bold text-white light:text-slate-900 tracking-wide">Google Client Credentials Required</h3>
            </div>

            <div className="text-xs text-slate-300 light:text-slate-700 space-y-3 leading-relaxed">
              <p>
                To connect real Gmail accounts in a multi-user environment, you must add Google Client Credentials to your root <code className="bg-white/5 light:bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-purple-400 text-[11px]">.env</code> file:
              </p>
              <pre className="p-3 bg-black/40 light:bg-slate-100 rounded-xl border border-white/5 light:border-slate-200 font-mono text-[10px] text-slate-400 light:text-slate-600 space-y-1">
                <div>GOOGLE_CLIENT_ID=your_client_id</div>
                <div>GOOGLE_CLIENT_SECRET=your_client_secret</div>
              </pre>
              <p>
                Alternatively, you can proceed in <strong>Simulated Mode</strong> to test with high-fidelity simulated email accounts and check the MCP tools schema.
              </p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowGmailSetupErrorModal(false)}
                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 light:border-slate-200 text-slate-300 light:text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConnectSimulatedGmail}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-900/20"
              >
                Simulated Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WHATSAPP CONNECTION DIALOG MODAL */}
      {showWhatsAppConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="bg-[#090d1a] light:bg-white border border-white/10 light:border-slate-200 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl relative">

            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-emerald-500">
                <SafeIcon hugeIcon={null} lucideIcon={Globe} size={24} className="text-emerald-500 animate-pulse" />
                <h3 className="text-base font-bold text-white light:text-slate-900 tracking-wide">Connect WhatsApp Account</h3>
              </div>
              <button
                onClick={() => setShowWhatsAppConnectModal(false)}
                className="p-1 rounded-lg hover:bg-white/5 light:hover:bg-slate-100 text-slate-400 hover:text-white light:hover:text-slate-950 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            {!whatsAppPairingCode && whatsAppConnectStatus !== "connecting" ? (
              <form onSubmit={handleStartConnectWhatsApp} className="space-y-4">
                <div className="text-xs text-slate-300 light:text-slate-700 leading-relaxed space-y-2">
                  <p>
                    Enter your phone number with your country code to generate a linking code for WhatsApp Web.
                  </p>
                  <p className="text-[10px] text-slate-500 light:text-slate-500">
                    Example: <span className="font-mono">+1 (555) 019-9000</span> should be entered as <span className="font-mono font-bold text-slate-400">+15550199000</span>
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="whatsapp-phone" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Phone Number
                  </label>
                  <input
                    id="whatsapp-phone"
                    type="tel"
                    placeholder="+1234567890"
                    value={whatsAppPhoneNumber}
                    onChange={(e) => setWhatsAppPhoneNumber(e.target.value)}
                    required
                    className="w-full bg-[#030712] light:bg-slate-50 border border-white/5 light:border-slate-200 rounded-xl px-4 py-2.5 text-xs text-white light:text-slate-900 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div className="flex flex-col space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isConnectingWhatsApp}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800/40 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/20"
                  >
                    {isConnectingWhatsApp ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Generate Linking Code</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleConnectSimulatedWhatsApp}
                    disabled={isConnectingWhatsApp}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 light:border-slate-200 text-slate-300 light:text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2"
                  >
                    <span>Connect in Simulated Mode</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6 text-center">
                <div className="text-xs text-slate-300 light:text-slate-700 leading-relaxed text-left space-y-2">
                  <p>
                    1. Open <strong>WhatsApp</strong> on your mobile device.
                  </p>
                  <p>
                    2. Go to <strong>Settings</strong> &gt; <strong>Linked Devices</strong> &gt; <strong>Link a Device</strong>.
                  </p>
                  <p>
                    3. Select <strong>Link with phone number instead</strong> and enter the code below:
                  </p>
                </div>

                {whatsAppPairingCode ? (
                  <div className="py-5 px-6 bg-[#030712] light:bg-slate-50 border border-white/5 light:border-slate-200 rounded-2xl shadow-inner flex flex-col items-center justify-center space-y-2.5">
                    <div className="text-3xl font-extrabold tracking-[0.2em] font-mono text-emerald-400 select-all">
                      {whatsAppPairingCode}
                    </div>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">Pairing Code</span>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center space-y-3">
                    <span className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin animate-duration-500" />
                    <span className="text-[10px] text-slate-500 animate-pulse">Requesting code from WhatsApp servers...</span>
                  </div>
                )}

                <div className="flex items-center justify-center space-x-2 pt-2 text-xs">
                  {whatsAppConnectStatus === "connected" ? (
                    <div className="text-emerald-400 font-bold flex items-center space-x-1.5 animate-bounce">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Linked Successfully! Redirecting...</span>
                    </div>
                  ) : (
                    <div className="text-slate-400 flex items-center space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span>Waiting for device connection...</span>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowWhatsAppConnectModal(false);
                    handleDisconnectWhatsApp();
                  }}
                  className="text-slate-500 hover:text-slate-300 text-xs font-semibold underline transition pt-2 block mx-auto font-mono"
                >
                  Cancel and Reset
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none ${toast.isExiting ? "animate-toast-out" : "animate-toast-in"
            }`}
        >
          <div className="flex items-center space-x-3 bg-gradient-to-r from-emerald-600/90 via-emerald-500/95 to-teal-600/90 text-white px-5 py-3 rounded-2xl shadow-[0_15px_40px_rgba(16,185,129,0.35)] border border-emerald-400/30 backdrop-blur-xl pointer-events-auto">
            <div className="bg-white/10 p-1.5 rounded-xl border border-white/10 shadow-inner flex items-center justify-center">
              <SafeIcon hugeIcon={CheckmarkCircle01Icon} lucideIcon={Check} size={18} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold tracking-widest uppercase text-emerald-100/70">System Alert</span>
              <span className="text-xs font-bold tracking-wide text-white">{toast.message}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================
   ALERTS PANEL
   ========================================== */
type AlertItem = {
  id: string;
  title: string;
  description: string;
  full_details?: string;
  source_app?: string;
  app_logo?: string;
  priority?: string;
  status: string;
  created_at?: string;
  triggered_at?: string;
  requires_response?: boolean;
  suggested_action?: string;
  condition?: string;
  last_action?: string;
};

type SuggestedAlert = {
  title: string;
  description: string;
  apps: string[];
  priority: string;
  condition: string;
  action: string;
};

type UserWithIntegrations = {
  id?: string;
  integrations?: Record<string, { connected?: boolean } | null>;
};

function AlertsPanel({
  title = "Alerts",
  subtitle = "Important alerts from your connected apps, monitored in the background by Trigger.dev."
}: {
  title?: string;
  subtitle?: string;
}) {
  const { user } = useAuth();
  const currentUser = user as UserWithIntegrations | null;
  const currentUserId = currentUser?.id;
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [suggestedAlerts, setSuggestedAlerts] = useState<SuggestedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [alertsError, setAlertsError] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftReply, setDraftReply] = useState("");
  const autoGenerationRequestedRef = useRef(false);
  const [aiSummary, setAiSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiSuggestedAction, setAiSuggestedAction] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [replyGuidance, setReplyGuidance] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    apps: ["gmail"] as string[],
    condition: "",
    priority: "medium",
    notificationMethod: "in_app",
    frequency: "real_time",
    action: "notify"
  });

  const appOptions = [
    { key: "gmail", label: "Gmail", logo: "/001-gmail.png" },
    { key: "whatsapp", label: "WhatsApp", logo: "/002-whatsapp.png" },
    { key: "slack", label: "Slack", logo: "/005-slack.png" },
    { key: "telegram", label: "Telegram", logo: "/004-telegram.png" },
    { key: "discord", label: "Discord", logo: "/006-discord.png" },
  ];

  const connectedApps: Record<string, boolean> = {
    gmail: !!currentUser?.integrations?.gmail?.connected,
    whatsapp: !!currentUser?.integrations?.whatsapp?.connected,
    slack: !!currentUser?.integrations?.slack?.connected,
    telegram: !!currentUser?.integrations?.telegram?.connected,
    discord: !!currentUser?.integrations?.discord?.connected,
  };
  const connectedAppKeys = appOptions.filter(app => connectedApps[app.key]).map(app => app.key);

  const today = new Date().toDateString();
  const stats = [
    { label: "Active Alerts", value: alerts.filter(a => ["active", "triggered"].includes(a.status)).length, icon: Bell, tone: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
    { label: "Triggered Today", value: alerts.filter(a => new Date(a.created_at || a.triggered_at || 0).toDateString() === today).length, icon: Clock, tone: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { label: "High Priority Alerts", value: alerts.filter(a => a.priority === "high").length, icon: Flag, tone: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    { label: "Resolved Alerts", value: alerts.filter(a => a.status === "resolved").length, icon: CheckCircle, tone: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  ];

  const priorityStyle: Record<string, string> = {
    high: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/25",
    low: "bg-blue-500/10 text-blue-400 border-blue-500/25",
  };

  const statusStyle: Record<string, string> = {
    active: "bg-rose-500/10 text-rose-400 border-rose-500/25",
    triggered: "bg-violet-500/10 text-violet-400 border-violet-500/25",
    resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
    snoozed: "bg-slate-500/10 text-slate-400 border-slate-500/25",
  };

  const fetchAlerts = React.useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    setAlertsError("");
    try {
      const res = await fetch(`/api/alerts?userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : []);
      } else {
        const data = await res.json().catch(() => null);
        setAlertsError(data?.error || "Unable to load alerts.");
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
      setAlertsError("Unable to load alerts.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const fetchSuggestions = React.useCallback(async () => {
    if (!currentUserId) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch(`/api/alerts/suggestions?userId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestedAlerts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch alert suggestions:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [currentUserId]);

  const requestAutoGeneration = React.useCallback(async () => {
    if (!currentUserId || autoGenerating) return;
    setAutoGenerating(true);
    setAlertsError("");
    setScanMessage("Scanning connected apps with AI...");
    try {
      const res = await fetch("/api/alerts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId })
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setAlertsError(data?.error || "Unable to run AI scan.");
        setScanMessage("");
        return;
      }

      await fetchAlerts();

      if ((data?.created || 0) > 0) {
        setScanMessage(`AI created ${data.created} alert${data.created === 1 ? "" : "s"} from ${data.scanned || 0} scanned item${data.scanned === 1 ? "" : "s"}.`);
      } else if ((data?.scanned || 0) > 0) {
        setScanMessage(`AI scanned ${data.scanned} item${data.scanned === 1 ? "" : "s"} and found no new important alerts.`);
      } else {
        setScanMessage("AI scan found no connected app activity to evaluate.");
      }
    } catch (error) {
      console.error("Failed to request automatic alert generation:", error);
      setAlertsError("Unable to run AI scan.");
      setScanMessage("");
    } finally {
      setAutoGenerating(false);
    }
  }, [autoGenerating, currentUserId, fetchAlerts]);

  useEffect(() => {
    if (!currentUserId) return;
    autoGenerationRequestedRef.current = false;
    const initialLoad = window.setTimeout(() => {
      void fetchAlerts();
      void fetchSuggestions();
    }, 0);
    const timer = window.setInterval(fetchAlerts, 30000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(timer);
    };
  }, [currentUserId, fetchAlerts, fetchSuggestions]);

  useEffect(() => {
    if (!currentUserId || loading || alerts.length > 0 || connectedAppKeys.length === 0) return;
    if (autoGenerationRequestedRef.current) return;
    autoGenerationRequestedRef.current = true;
    const timer = window.setTimeout(() => {
      void requestAutoGeneration();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [alerts.length, connectedAppKeys.length, currentUserId, loading, requestAutoGeneration]);

  useEffect(() => {
    if (!currentUserId) return;
    const channel = `alerts:${currentUserId}`;
    let active = true;
    const refreshFromRealtime = () => {
      if (!active) return;
      void fetchAlerts();
      void fetchSuggestions();
    };

    insforge.realtime.connect()
      .then(() => insforge.realtime.subscribe(channel))
      .catch(error => console.error("Failed to subscribe to alert realtime:", error));

    insforge.realtime.on("alert_created", refreshFromRealtime);
    insforge.realtime.on("alert_updated", refreshFromRealtime);
    insforge.realtime.on("alert_rule_created", refreshFromRealtime);
    insforge.realtime.on("alert_suggestions_updated", refreshFromRealtime);

    return () => {
      active = false;
      insforge.realtime.off("alert_created", refreshFromRealtime);
      insforge.realtime.off("alert_updated", refreshFromRealtime);
      insforge.realtime.off("alert_rule_created", refreshFromRealtime);
      insforge.realtime.off("alert_suggestions_updated", refreshFromRealtime);
      insforge.realtime.unsubscribe(channel);
    };
  }, [currentUserId, fetchAlerts, fetchSuggestions]);

  const toggleFormApp = (app: string) => {
    setForm(current => ({
      ...current,
      apps: current.apps.includes(app) ? current.apps.filter(item => item !== app) : [...current.apps, app]
    }));
  };

  const handleCreateAlert = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUserId || creating) return;
    const selectedConnectedApps = form.apps.filter(app => connectedApps[app]);
    if (selectedConnectedApps.length === 0) {
      setAlertsError("Connect at least one app before creating an alert rule.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/alerts/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, ...form, apps: selectedConnectedApps })
      });
      if (res.ok) {
        setShowCreateDialog(false);
        setForm({ name: "", description: "", apps: connectedAppKeys.slice(0, 1), condition: "", priority: "medium", notificationMethod: "in_app", frequency: "real_time", action: "notify" });
        await fetchAlerts();
        await fetchSuggestions();
      } else {
        const data = await res.json().catch(() => null);
        setAlertsError(data?.error || "Unable to create alert rule.");
      }
    } catch (error) {
      console.error("Failed to create alert rule:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleAlertAction = async (action: string) => {
    if (!selectedAlert || !currentUserId) return;
    try {
      const res = await fetch("/api/alerts/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, alertId: selectedAlert.id, action })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedAlert(current => current ? { 
          ...current, 
          status: updated.status || current.status,
          last_action: updated.last_action || current.last_action 
        } : current);
        await fetchAlerts();
      }
    } catch (error) {
      console.error("Failed to update alert:", error);
    }
  };

  const handleGenerateDraft = async () => {
    if (!selectedAlert || drafting) return;
    setDrafting(true);
    try {
      const res = await fetch("/api/alerts/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          feature: "reply",
          replyContext: replyGuidance
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDraftReply(data.result || "");
      }
    } catch (error) {
      console.error("Failed to draft alert reply:", error);
    } finally {
      setDrafting(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedAlert || summaryLoading) return;
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/alerts/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          feature: "summary"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.result || "");
      }
    } catch (error) {
      console.error("Failed to generate alert summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleGenerateNextAction = async () => {
    if (!selectedAlert || actionLoading) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/alerts/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertId: selectedAlert.id,
          feature: "next_action"
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestedAction(data.result || "");
      }
    } catch (error) {
      console.error("Failed to generate next action:", error);
    } finally {
      setActionLoading(false);
    }
  };

  const applySuggestion = (suggestion: SuggestedAlert) => {
    setForm({
      name: suggestion.title,
      description: suggestion.description,
      apps: suggestion.apps,
      condition: suggestion.condition,
      priority: suggestion.priority,
      notificationMethod: "in_app",
      frequency: "real_time",
      action: suggestion.action
    });
    setShowCreateDialog(true);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          Create New Alert
        </button>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white dark:bg-[#0d111e]/50 border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${stat.tone}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-white mt-4">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6 items-start">
        <div className="bg-white dark:bg-[#0d111e]/50 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Recent Alerts Timeline</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Realtime updates from AI and custom Trigger.dev monitoring jobs.</p>
            </div>
            <button
              onClick={() => {
                void fetchAlerts();
                void fetchSuggestions();
              }}
              className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center justify-center transition"
              title="Refresh alerts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {scanMessage && !alertsError && (
            <div className="mb-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs font-semibold text-blue-500">
              {scanMessage}
            </div>
          )}

          {alertsError ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-500">
              {alertsError}
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(item => (
                <div key={item} className="h-28 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-8 text-center">
              <Bell className="w-8 h-8 mx-auto text-slate-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3">
                {autoGenerating ? "AI is scanning connected apps" : "No triggered alerts yet"}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {connectedAppKeys.length === 0
                  ? "Connect Gmail or WhatsApp so AI can generate alerts from real app activity."
                  : autoGenerating
                    ? "AI is checking real connected app data. Matching alerts will appear here automatically."
                    : "AI monitoring runs automatically. You can also create a custom alert rule for specific conditions."}
              </p>
              {connectedAppKeys.length > 0 && (
                <button
                  onClick={() => void requestAutoGeneration()}
                  disabled={autoGenerating}
                  className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold transition"
                >
                  <Sparkles className="w-4 h-4" />
                  {autoGenerating ? "Scanning..." : "Run AI Scan"}
                </button>
              )}
            </div>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-5 top-4 bottom-4 w-px bg-slate-200 dark:bg-white/10" />
              {alerts.map((alert) => {
              const createdAt = alert.created_at || alert.triggered_at || new Date().toISOString();
              const app = appOptions.find(option => option.key === alert.source_app);
              return (
                <button
                  key={alert.id}
                  onClick={() => {
                    setSelectedAlert(alert);
                    setDraftReply("");
                    setAiSummary("");
                    setAiSuggestedAction("");
                    setReplyGuidance("");
                  }}
                  className="relative w-full text-left pl-14 pb-5 last:pb-0 group"
                >
                  <span className="absolute left-0 top-1 w-10 h-10 rounded-2xl bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                    <img src={alert.app_logo || app?.logo || "/003-email.png"} alt="" className="w-5 h-5 object-contain" />
                  </span>
                  <span className="block rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.03] p-4 group-hover:border-rose-300 dark:group-hover:border-rose-500/40 transition">
                    <span className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <span>
                        <span className="block text-sm font-bold text-slate-900 dark:text-white">{alert.title}</span>
                        <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{alert.description}</span>
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-500 whitespace-nowrap">
                        {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
                      </span>
                    </span>
                    <span className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {app?.label || alert.source_app || "Connected app"}
                      </span>
                      <span className={`inline-flex px-2 py-1 rounded-lg border text-[11px] font-bold capitalize ${priorityStyle[alert.priority || "medium"] || priorityStyle.medium}`}>
                        {alert.priority || "medium"}
                      </span>
                      <span className={`inline-flex px-2 py-1 rounded-lg border text-[11px] font-bold capitalize ${statusStyle[alert.status] || statusStyle.active}`}>
                        {alert.status || "active"}
                      </span>
                    </span>
                  </span>
                </button>
              );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-[#0d111e]/50 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">AI Suggested Alerts</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Generated from real connected app activity.</p>
            </div>
          </div>

          {suggestionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(item => (
                <div key={item} className="h-32 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : suggestedAlerts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 text-center">
              <Bot className="w-7 h-7 mx-auto text-slate-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-3">No suggestions yet</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Connect Gmail or WhatsApp and sync activity to generate alert recommendations.</p>
            </div>
          ) : (
            suggestedAlerts.map((suggestion) => (
              <div key={suggestion.title} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{suggestion.title}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">{suggestion.description}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-lg border text-[10px] font-bold capitalize ${priorityStyle[suggestion.priority]}`}>
                    {suggestion.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 mt-4">
                  <div className="flex -space-x-2">
                    {suggestion.apps.map((appKey) => {
                      const app = appOptions.find(option => option.key === appKey);
                      return <img key={appKey} src={app?.logo || "/003-email.png"} alt="" className="w-7 h-7 rounded-full border-2 border-white dark:border-[#0d111e] bg-white p-1" />;
                    })}
                  </div>
                  <button
                    onClick={() => applySuggestion(suggestion)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold transition"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    Use
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreateDialog(false)} />
          <form onSubmit={handleCreateAlert} className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0d111e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Create New Alert</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Trigger.dev will monitor selected app data and save matches to your alerts feed.</p>
              </div>
              <button type="button" onClick={() => setShowCreateDialog(false)} className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Alert name</span>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500" />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Priority level</span>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
            </div>

            <label className="space-y-2 block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Description</span>
              <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500 resize-none" />
            </label>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Selected apps</span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {appOptions.map((app) => {
                  const active = form.apps.includes(app.key);
                  const connected = connectedApps[app.key];
                  return (
                    <button
                      key={app.key}
                      type="button"
                      onClick={() => toggleFormApp(app.key)}
                      disabled={!connected}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition ${active ? "border-rose-500 bg-rose-500/10 text-rose-500" : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400"} ${!connected ? "opacity-45 cursor-not-allowed" : "hover:bg-slate-50 dark:hover:bg-white/5"}`}
                    >
                      <img src={app.logo} alt="" className="w-4 h-4 object-contain" />
                      {app.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="space-y-2 block">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Alert condition or trigger rule</span>
              <textarea required value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} rows={3} placeholder="Example: Alert me when Gmail has an unread client email that mentions urgent, deadline, invoice, or follow up." className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500 resize-none" />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Notification method</span>
                <select value={form.notificationMethod} onChange={e => setForm({ ...form, notificationMethod: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500">
                  <option value="in_app">In-app</option>
                  <option value="email">Email</option>
                  <option value="push">Push</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Frequency</span>
                <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500">
                  <option value="real_time">Real-time</option>
                  <option value="15_minutes">Every 15 minutes</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Action when triggered</span>
                <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })} className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-rose-500">
                  <option value="notify">Notify me</option>
                  <option value="draft_reply">Draft reply</option>
                  <option value="create_task">Create task</option>
                  <option value="mark_follow_up">Create follow-up</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowCreateDialog(false)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition">Cancel</button>
              <button type="submit" disabled={creating} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-xs font-bold transition">{creating ? "Creating..." : "Create Alert"}</button>
            </div>
          </form>
        </div>
      )}

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSelectedAlert(null)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0d111e] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <img src={selectedAlert.app_logo || "/003-email.png"} alt="" className="w-11 h-11 rounded-2xl border border-slate-200 dark:border-white/10 bg-white p-2 object-contain" />
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">{selectedAlert.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{selectedAlert.source_app || "Connected app"} • {format(new Date(selectedAlert.created_at || selectedAlert.triggered_at || new Date()), "MMM d, h:mm a")}</p>
                </div>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center text-slate-500 transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold capitalize ${priorityStyle[selectedAlert.priority || "medium"] || priorityStyle.medium}`}>{selectedAlert.priority || "medium"} priority</span>
              <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold capitalize ${statusStyle[selectedAlert.status] || statusStyle.active}`}>{selectedAlert.status || "active"}</span>
              {selectedAlert.last_action === "task" && (
                <span className="px-2.5 py-1 rounded-lg border border-blue-500/30 bg-blue-500/10 text-[11px] font-bold text-blue-400 animate-pulse">Converted to Task</span>
              )}
              {selectedAlert.last_action === "follow_up" && (
                <span className="px-2.5 py-1 rounded-lg border border-violet-500/30 bg-violet-500/10 text-[11px] font-bold text-violet-400 animate-pulse">Converted to Follow-up</span>
              )}
              {selectedAlert.last_action === "send_reply" && (
                <span className="px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-[11px] font-bold text-emerald-400">Reply Sent</span>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-4 space-y-4">
              <div>
                <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Alert Content</span>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{selectedAlert.full_details || selectedAlert.description}</p>
              </div>

              {selectedAlert.condition && (
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-white/5">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Trigger rule:</span> {selectedAlert.condition}
                </div>
              )}

              {/* AI Summary Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">AI Summary</span>
                  <button 
                    onClick={handleGenerateSummary} 
                    disabled={summaryLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-[10px] font-bold text-violet-500 hover:text-violet-400 disabled:opacity-50 transition"
                  >
                    <Sparkles className="w-3 h-3" />
                    {summaryLoading ? "Summarizing..." : aiSummary ? "Regenerate" : "Generate Summary"}
                  </button>
                </div>
                {aiSummary ? (
                  <div className="bg-[#030712]/50 rounded-xl p-3 border border-white/5 text-xs text-slate-600 dark:text-slate-300 space-y-1 animate-fade-in whitespace-pre-line leading-relaxed">
                    {aiSummary}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Generate an AI summary to get key bullet points instantly.</p>
                )}
              </div>

              {/* AI Next Action Section */}
              <div className="pt-3 border-t border-slate-200 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">AI Suggested Action</span>
                  <button 
                    onClick={handleGenerateNextAction} 
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-[10px] font-bold text-violet-500 hover:text-violet-400 disabled:opacity-50 transition"
                  >
                    <Bot className="w-3 h-3" />
                    {actionLoading ? "Thinking..." : aiSuggestedAction ? "Refresh suggestion" : "Suggest Next Action"}
                  </button>
                </div>
                {(aiSuggestedAction || selectedAlert.suggested_action) ? (
                  <div className="bg-violet-500/5 rounded-xl p-3 border border-violet-500/10 text-xs text-violet-600 dark:text-violet-300 font-medium animate-fade-in">
                    {aiSuggestedAction || selectedAlert.suggested_action}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">No suggestion yet. Ask AI to analyze the next action.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button onClick={() => handleAlertAction("resolved")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-500 hover:bg-emerald-500/15 transition"><ClipboardCheck className="w-4 h-4" />Resolve</button>
              <button onClick={() => handleAlertAction("snoozed")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-white/10 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"><PauseCircle className="w-4 h-4" />Snooze</button>
              <button onClick={() => handleAlertAction("task")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-bold text-blue-500 hover:bg-blue-500/15 transition"><CheckCircle className="w-4 h-4" />Task</button>
              <button onClick={() => handleAlertAction("follow_up")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-500 hover:bg-violet-500/15 transition"><ArrowRight className="w-4 h-4" />Follow-up</button>
            </div>

            {selectedAlert.requires_response && (
              <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3 bg-[#030712]/20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">AI Reply Composer</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Draft, edit, and send a reply directly.</p>
                  </div>
                  <button onClick={handleGenerateDraft} disabled={drafting} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 px-3 py-2 text-xs font-bold text-white transition shadow-lg shadow-violet-600/20">
                    <Sparkles className="w-4 h-4" />
                    {drafting ? "Drafting..." : "Generate draft"}
                  </button>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reply Guidance (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g., 'Politely decline and suggest next week', 'Acknowledge receipt'" 
                    value={replyGuidance} 
                    onChange={e => setReplyGuidance(e.target.value)} 
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500 placeholder-slate-500" 
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Message Draft</label>
                  <textarea value={draftReply} onChange={e => setDraftReply(e.target.value)} rows={5} placeholder="AI generated draft will appear here..." className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2 text-xs text-slate-900 dark:text-white outline-none focus:border-violet-500 resize-none" />
                </div>

                <button onClick={() => handleAlertAction("send_reply")} disabled={!draftReply.trim()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 disabled:opacity-50 px-4 py-2.5 text-xs font-bold transition shadow-md">
                  <Send className="w-4 h-4" />
                  Send Reply
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================
   SETTINGS PANEL
   ========================================== */
type AssistantSettings = {
  displayName: string;
  roleContext: string;
  timezone: string;
  detailLevel: "minimal" | "standard" | "detailed";
  responseTone: "direct" | "friendly" | "executive";
  autoDraftReplies: boolean;
  proactiveSuggestions: boolean;
  briefingCadence: "morning" | "twice_daily" | "manual";
  briefingChannels: string[];
  syncFrequency: "real_time" | "15_minutes" | "hourly";
  alertPriority: "all" | "medium_high" | "high";
  alertMethods: string[];
  dataRetention: "30_days" | "90_days" | "1_year";
  saveAiMemory: boolean;
  shareUsageAnalytics: boolean;
};

type SettingsUser = {
  email?: string;
  phone?: string;
  name?: string;
  isPhoneAuth?: boolean;
  profile?: {
    name?: string;
  };
  integrations?: Record<string, { connected?: boolean } | null | undefined>;
};

const SETTINGS_STORAGE_KEY = "omnisync_assistant_settings";

function getDefaultAssistantSettings(user?: SettingsUser | null): AssistantSettings {
  const browserTimezone = typeof Intl !== "undefined"
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : "America/New_York";

  return {
    displayName: user?.profile?.name || user?.name || user?.email?.split("@")?.[0] || "",
    roleContext: "Personal productivity, communication triage, and executive follow-ups",
    timezone: browserTimezone || "America/New_York",
    detailLevel: "standard",
    responseTone: "friendly",
    autoDraftReplies: true,
    proactiveSuggestions: true,
    briefingCadence: "morning",
    briefingChannels: ["in_app", "email"],
    syncFrequency: "real_time",
    alertPriority: "medium_high",
    alertMethods: ["in_app"],
    dataRetention: "90_days",
    saveAiMemory: true,
    shareUsageAnalytics: false,
  };
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white dark:bg-[#0d111e]/70 border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-500 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{description}</p>
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">{label}</span>
      {hint && <span className="block text-[11px] text-slate-500 dark:text-slate-500 mt-0.5">{hint}</span>}
    </div>
  );
}

function ToggleSetting({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] px-3 py-3">
      <FieldLabel label={label} hint={hint} />
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border p-0.5 transition ${
          checked
            ? "bg-violet-600 border-violet-500"
            : "bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-white/10"
        }`}
        aria-pressed={checked}
        title={checked ? "Enabled" : "Disabled"}
      >
        <span
          className={`h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function MultiChoiceSetting({
  options,
  selected,
  onChange,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value]);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={`px-3 py-2 rounded-xl border text-xs font-bold transition ${
              active
                ? "border-violet-500 bg-violet-500/10 text-violet-500"
                : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function SettingsPanel() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const [settings, setSettings] = useState<AssistantSettings>(() => getDefaultAssistantSettings(user));
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      try {
        setSettings({ ...getDefaultAssistantSettings(user), ...JSON.parse(saved) });
      } catch (error) {
        console.error("Unable to parse saved assistant settings:", error);
      }
    } else {
      setSettings(getDefaultAssistantSettings(user));
    }
  }, [user]);

  const updateSetting = <Key extends keyof AssistantSettings>(key: Key, value: AssistantSettings[Key]) => {
    setSettings(current => ({ ...current, [key]: value }));
    setSaveState("idle");
  };

  const handleSave = () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 2500);
  };

  const handleReset = () => {
    const defaults = getDefaultAssistantSettings(user);
    setSettings(defaults);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaults));
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 2500);
  };

  const connectedPlatforms = [
    { id: "gmail", name: "Gmail", logo: "/001-gmail.png", connected: !!user?.integrations?.gmail?.connected },
    { id: "whatsapp", name: "WhatsApp", logo: "/002-whatsapp.png", connected: !!user?.integrations?.whatsapp?.connected },
    { id: "slack", name: "Slack", logo: "/005-slack.png", connected: !!user?.integrations?.slack?.connected },
    { id: "telegram", name: "Telegram", logo: "/004-telegram.png", connected: !!user?.integrations?.telegram?.connected },
    { id: "discord", name: "Discord", logo: "/006-discord.png", connected: !!user?.integrations?.discord?.connected },
  ];

  const activeConnectionCount = connectedPlatforms.filter(platform => platform.connected).length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tune how OmniSync summarizes, alerts, syncs data, and protects your workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition"
          >
            <Save className="w-4 h-4" />
            {saveState === "saved" ? "Saved" : "Save Settings"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-6 items-start">
        <div className="space-y-6">
          <SettingsSection
            icon={User}
            title="Account Profile"
            description="Personal context used in briefings, reply drafts, and dashboard greeting."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <FieldLabel label="Display name" hint="Shown across the dashboard." />
                <input
                  value={settings.displayName}
                  onChange={event => updateSetting("displayName", event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
                />
              </label>
              <label className="space-y-2">
                <FieldLabel label="Timezone" hint="Used for alerts and scheduled briefings." />
                <input
                  value={settings.timezone}
                  onChange={event => updateSetting("timezone", event.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
                />
              </label>
            </div>
            <label className="space-y-2 block">
              <FieldLabel label="Assistant context" hint="A short operating brief for AI prioritization." />
              <textarea
                value={settings.roleContext}
                onChange={event => updateSetting("roleContext", event.target.value)}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500 resize-none"
              />
            </label>
          </SettingsSection>

          <SettingsSection
            icon={Bot}
            title="AI Agent Behavior"
            description="Control the level of detail, tone, and autonomy for assistant-generated output."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <FieldLabel label="Summary detail" hint="Default depth for AI summaries." />
                <select
                  value={settings.detailLevel}
                  onChange={event => updateSetting("detailLevel", event.target.value as AssistantSettings["detailLevel"])}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
                >
                  <option value="minimal">Minimal action items</option>
                  <option value="standard">Standard executive summary</option>
                  <option value="detailed">Detailed context and entities</option>
                </select>
              </label>
              <label className="space-y-2">
                <FieldLabel label="Reply tone" hint="Applied to generated drafts." />
                <select
                  value={settings.responseTone}
                  onChange={event => updateSetting("responseTone", event.target.value as AssistantSettings["responseTone"])}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
                >
                  <option value="direct">Direct and concise</option>
                  <option value="friendly">Friendly and polished</option>
                  <option value="executive">Executive and formal</option>
                </select>
              </label>
            </div>
            <ToggleSetting
              checked={settings.autoDraftReplies}
              onChange={value => updateSetting("autoDraftReplies", value)}
              label="Auto-prepare reply drafts"
              hint="Create draft replies when alerts require a response."
            />
            <ToggleSetting
              checked={settings.proactiveSuggestions}
              onChange={value => updateSetting("proactiveSuggestions", value)}
              label="Proactive next actions"
              hint="Suggest follow-ups, tasks, and summaries after important messages."
            />
          </SettingsSection>

          <SettingsSection
            icon={Newspaper}
            title="Briefings"
            description="Choose when daily intelligence summaries are generated and where they appear."
          >
            <label className="space-y-2 block">
              <FieldLabel label="Briefing cadence" hint="Default schedule for dashboard and email digests." />
              <select
                value={settings.briefingCadence}
                onChange={event => updateSetting("briefingCadence", event.target.value as AssistantSettings["briefingCadence"])}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
              >
                <option value="morning">Morning digest</option>
                <option value="twice_daily">Morning and evening</option>
                <option value="manual">Manual refresh only</option>
              </select>
            </label>
            <div className="space-y-2">
              <FieldLabel label="Delivery channels" hint="Where briefings should be shown." />
              <MultiChoiceSetting
                selected={settings.briefingChannels}
                onChange={value => updateSetting("briefingChannels", value)}
                options={[
                  { value: "in_app", label: "In-app" },
                  { value: "email", label: "Email" },
                  { value: "whatsapp", label: "WhatsApp" },
                ]}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={Bell}
            title="Alerts & Notifications"
            description="Set defaults for Trigger.dev monitoring, urgency filtering, and notification routing."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2">
                <FieldLabel label="Sync frequency" hint="How often connected apps are scanned." />
                <select
                  value={settings.syncFrequency}
                  onChange={event => updateSetting("syncFrequency", event.target.value as AssistantSettings["syncFrequency"])}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
                >
                  <option value="real_time">Realtime where available</option>
                  <option value="15_minutes">Every 15 minutes</option>
                  <option value="hourly">Hourly batch</option>
                </select>
              </label>
              <label className="space-y-2">
                <FieldLabel label="Priority threshold" hint="Default filter for generated alerts." />
                <select
                  value={settings.alertPriority}
                  onChange={event => updateSetting("alertPriority", event.target.value as AssistantSettings["alertPriority"])}
                  className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
                >
                  <option value="all">All priorities</option>
                  <option value="medium_high">Medium and high only</option>
                  <option value="high">High only</option>
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <FieldLabel label="Notification methods" hint="Used as default when creating alert rules." />
              <MultiChoiceSetting
                selected={settings.alertMethods}
                onChange={value => updateSetting("alertMethods", value)}
                options={[
                  { value: "in_app", label: "In-app" },
                  { value: "email", label: "Email" },
                  { value: "push", label: "Push" },
                  { value: "whatsapp", label: "WhatsApp" },
                ]}
              />
            </div>
          </SettingsSection>

          <SettingsSection
            icon={LockKeyhole}
            title="Privacy & Data"
            description="Manage memory, retention, and optional analytics for assistant improvement."
          >
            <label className="space-y-2 block">
              <FieldLabel label="Data retention" hint="How long synced summaries and generated context are kept locally." />
              <select
                value={settings.dataRetention}
                onChange={event => updateSetting("dataRetention", event.target.value as AssistantSettings["dataRetention"])}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#030712] px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-violet-500"
              >
                <option value="30_days">30 days</option>
                <option value="90_days">90 days</option>
                <option value="1_year">1 year</option>
              </select>
            </label>
            <ToggleSetting
              checked={settings.saveAiMemory}
              onChange={value => updateSetting("saveAiMemory", value)}
              label="Save assistant memory"
              hint="Remember preferences that improve future summaries and drafts."
            />
            <ToggleSetting
              checked={settings.shareUsageAnalytics}
              onChange={value => updateSetting("shareUsageAnalytics", value)}
              label="Product analytics"
              hint="Allow anonymous usage signals for reliability and feature planning."
            />
          </SettingsSection>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24">
          <SettingsSection
            icon={theme === "dark" ? Moon : Sun}
            title="Appearance"
            description="Theme preference is applied immediately across the app."
          >
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] px-3 py-3">
              <FieldLabel label="Theme" hint={`${theme === "dark" ? "Dark" : "Light"} mode active`} />
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none cursor-pointer p-0.5 border ${
                  theme === "dark"
                      ? "bg-indigo-950/60 border-indigo-500/30"
                      : "bg-amber-50 border-amber-200"
                }`}
                title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                <span className="sr-only">Toggle theme</span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full transition-all duration-300 shadow ${
                    theme === "dark"
                        ? "translate-x-5 bg-indigo-500"
                        : "translate-x-0 bg-amber-400"
                  }`}
                >
                  {theme === "dark" ? <Moon className="h-3 w-3 text-white" /> : <Sun className="h-3 w-3 text-white" />}
                </span>
              </button>
            </div>
          </SettingsSection>

          <SettingsSection
            icon={Plug}
            title="Connected Apps"
            description={`${activeConnectionCount} of ${connectedPlatforms.length} integrations active.`}
          >
            <div className="space-y-2">
              {connectedPlatforms.map(platform => (
                <div key={platform.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] px-3 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <img src={platform.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{platform.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                    platform.connected
                      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500"
                      : "border-slate-200 dark:border-white/10 text-slate-500"
                  }`}>
                    {platform.connected ? "Connected" : "Off"}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => router.push("/dashboard?tab=integrations")}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
            >
              <Plug className="w-4 h-4" />
              Manage Integrations
            </button>
          </SettingsSection>

          <SettingsSection
            icon={ShieldCheck}
            title="Security"
            description="Account and export actions for the active session."
          >
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] px-3 py-3 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <Smartphone className="w-4 h-4 text-violet-500" />
                {user?.isPhoneAuth ? "Phone authentication" : "InsForge authentication"}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email || user?.phone || "No active account details"}</p>
            </div>
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
            >
              <Download className="w-4 h-4" />
              Export Settings
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard?tab=pricing")}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition"
            >
              <CreditCard className="w-4 h-4" />
              Billing Settings
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-rose-500/20 bg-rose-500/10 text-xs font-bold text-rose-500 hover:bg-rose-500/15 transition"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </SettingsSection>

          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex items-start gap-3">
              <Database className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-blue-600 dark:text-blue-300">Local preference storage</h4>
                <p className="text-xs text-blue-700/80 dark:text-blue-200/80 mt-1 leading-relaxed">
                  These controls are saved in this browser and can be wired to a backend preferences table when account-level syncing is added.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {saveState === "saved" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-emerald-500/20 bg-emerald-600 text-white px-4 py-3 shadow-xl shadow-emerald-600/25 text-xs font-bold">
          Settings saved successfully
        </div>
      )}
    </div>
  );
}


/* ==========================================
   PRICING PANEL (Solid Premium Visuals)
   ========================================== */
function PricingPanel() {
  const plans = [
    { name: "Starter", price: "$0", desc: "Ideal for individual testing", active: true, features: ["1 connected account", "Basic AI summaries", "Daily email briefing"] },
    { name: "Premium Pro", price: "$29", desc: "Unlimited cognitive assistant power", active: false, features: ["All accounts connected", "Real-time sync & notifications", "Conflict calendar reschedule", "Custom replies auto-draft", "Priority support"] }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-white light:text-slate-900 tracking-wide">Pricing Settings & Subscriptions</h2>
        <p className="text-xs text-slate-400">Configure your subscription level and check your token usage status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`p-6 rounded-3xl border flex flex-col justify-between relative overflow-hidden transition ${p.name.includes("Pro")
              ? "bg-gradient-to-tr from-purple-900/30 via-[#090d1a] to-blue-900/10 light:from-purple-500/10 light:via-white light:to-blue-500/10 border-purple-500/20 light:border-purple-500/35 shadow-xl shadow-purple-900/10"
              : "bg-white/[0.01] light:bg-white border-white/5 light:border-slate-200"
              }`}
          >
            {p.name.includes("Pro") && (
              <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-purple-600 text-[9px] font-bold text-white uppercase tracking-wider">
                Popular
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white light:text-slate-900">{p.name}</h3>
                <p className="text-xs text-slate-500">{p.desc}</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-3xl font-extrabold text-white light:text-slate-900">{p.price}</span>
                <span className="text-xs text-slate-500 ml-1">/ month</span>
              </div>
              <ul className="space-y-2 pt-4 border-t border-white/5 light:border-slate-150">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-center text-xs text-slate-400 font-medium">
                    <span className="mr-2 text-purple-400">
                      <SafeIcon hugeIcon={CheckmarkCircle01Icon} lucideIcon={Check} size={14} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition ${p.active
                ? "bg-white/5 light:bg-slate-50 border border-white/10 light:border-slate-200 text-slate-400 cursor-default"
                : "bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white shadow-lg shadow-purple-600/20"
                }`}
            >
              {p.active ? "Current Subscription" : "Upgrade Plan"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
