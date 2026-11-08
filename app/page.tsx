"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";

// Types for the Interactive Playground
interface DemoChannel {
  id: string;
  name: string;
  color: string;
  borderColor: string;
  glowColor: string;
  icon: React.ReactNode;
  sender: string;
  time: string;
  avatarText: string;
  avatarBg: string;
  inputMessage: string;
  aiAction: string;
  aiType: "reminder" | "summary" | "reply" | "conflict";
  aiOutputTitle: string;
  aiOutputContent: React.ReactNode;
}

export default function Home() {
  const { user, signOut } = useAuth();
  
  // Navigation states
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Playground states
  const [activeChannel, setActiveChannel] = useState<string>("gmail");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playProgress, setPlayProgress] = useState<number>(0);
  const [showAiResult, setShowAiResult] = useState<boolean>(false);
  
  // Custom interactive waitlist states
  const [email, setEmail] = useState("");
  const [waitlistStatus, setWaitlistStatus] = useState<"idle" | "loading" | "success">("idle");
  const [waitlistCount, setWaitlistCount] = useState(1428);

  // FAQ states
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Track page scroll for header background opacity
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle playground simulation animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      setShowAiResult(false);
      setPlayProgress(0);
      
      const step = 2; // speed
      interval = setInterval(() => {
        setPlayProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsPlaying(false);
            setShowAiResult(true);
            return 100;
          }
          return prev + step;
        });
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Trigger playground process
  const triggerSimulation = () => {
    setIsPlaying(true);
  };

  // Handle Waitlist Submit
  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setWaitlistStatus("loading");
    setTimeout(() => {
      setWaitlistStatus("success");
      setWaitlistCount(prev => prev + 1);
    }, 1200);
  };

  // Channels Data for Interactive Playground
  const channels: DemoChannel[] = [
    {
      id: "gmail",
      name: "Gmail",
      color: "from-red-500 to-rose-600",
      borderColor: "border-red-500/20",
      glowColor: "rgba(239, 68, 68, 0.15)",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
      ),
      sender: "sarah.finance@corp.com",
      time: "10:42 AM",
      avatarText: "SF",
      avatarBg: "bg-red-500/20 text-red-300 border-red-500/30",
      inputMessage: "Hi Rahul, please review the final Q2 budget draft before our meeting tomorrow. Let me know if we need to adjust the Marketing allocation by 10%. Thanks!",
      aiAction: "Summarizing & Drafting Reply",
      aiType: "reply",
      aiOutputTitle: "Gmail Assistant Core",
      aiOutputContent: (
        <div className="space-y-3">
          <div className="p-2.5 bg-white/5 rounded-lg border border-white/5">
            <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase block mb-1">AI Executive Summary</span>
            <p className="text-xs text-slate-300 leading-relaxed">
              Review Q2 budget draft. Decide if marketing allocation requires a 10% adjustment. Action required before tomorrow's sync.
            </p>
          </div>
          <div className="p-2.5 bg-white/5 rounded-lg border border-purple-500/20 relative">
            <div className="absolute top-2 right-2 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-[9px] text-emerald-400 font-medium">Suggested Draft</span>
            </div>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase block mb-1">Auto-Draft Reply</span>
            <p className="text-xs text-slate-200 italic leading-relaxed">
              "Hi Sarah, thanks. I've reviewed the draft. The 10% marketing shift looks reasonable given Q3 targets. Let's lock it in during tomorrow's call."
            </p>
          </div>
        </div>
      )
    },
    {
      id: "whatsapp",
      name: "WhatsApp",
      color: "from-green-400 to-emerald-500",
      borderColor: "border-emerald-500/20",
      glowColor: "rgba(16, 185, 129, 0.15)",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.46h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      ),
      sender: "Alex (Co-Founder)",
      time: "02:15 PM",
      avatarText: "A",
      avatarBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      inputMessage: "Hey! Let's do a quick coffee chat tomorrow at 4:30 PM near the downtown office to discuss the product roadmap. Let me know if that works.",
      aiAction: "Extracting Event & Checking Schedule",
      aiType: "reminder",
      aiOutputTitle: "WhatsApp Sync Core",
      aiOutputContent: (
        <div className="space-y-3">
          <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Smart Calendar Extraction</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-medium border border-amber-500/30">Action Needed</span>
            </div>
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-white">Roadmap Coffee Chat with Alex</h4>
              <div className="flex items-center text-[11px] text-slate-300 space-x-4">
                <span className="flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                  Tomorrow
                </span>
                <span className="flex items-center">
                  <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  4:30 PM - 5:00 PM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center">
                <svg className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                Near Downtown Office
              </p>
            </div>
          </div>
          <button className="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-medium transition duration-200 shadow-md shadow-indigo-600/20">
            Sync to Google Calendar
          </button>
        </div>
      )
    },
    {
      id: "telegram",
      name: "Telegram",
      color: "from-blue-400 to-sky-500",
      borderColor: "border-sky-500/20",
      glowColor: "rgba(56, 189, 248, 0.15)",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.72-2.5 2.77-2.7.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.92 1.22-5.43 3.59-.51.35-.98.53-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.75 3.87-1.68 6.45-2.79 7.74-3.33 3.68-1.54 4.44-1.81 4.94-1.82.11 0 .36.03.52.16.14.11.18.26.19.37 0 .07-.01.21-.02.28z"/>
        </svg>
      ),
      sender: "Dev Team Channel (99+ messages)",
      time: "03:55 PM",
      avatarText: "DT",
      avatarBg: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      inputMessage: "System crashed again on production. Fixed by scaling the database pods. We need to audit the database connection pooling config. Mark is writing the post-mortem. Deploy scheduled for tomorrow morning.",
      aiAction: "Synthesizing Channel Updates",
      aiType: "summary",
      aiOutputTitle: "Telegram Agent Core",
      aiOutputContent: (
        <div className="space-y-2.5">
          <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Dev Team Channel Digest</span>
          <div className="space-y-1.5 text-xs text-slate-300">
            <div className="flex items-start">
              <span className="text-purple-400 mr-1.5">•</span>
              <span><strong>Incident resolved</strong>: Database pods scaled to mitigate production crash.</span>
            </div>
            <div className="flex items-start">
              <span className="text-purple-400 mr-1.5">•</span>
              <span><strong>Action Item</strong>: Audit database connection pooling configurations.</span>
            </div>
            <div className="flex items-start">
              <span className="text-purple-400 mr-1.5">•</span>
              <span><strong>Owner</strong>: Mark is writing the incident post-mortem report.</span>
            </div>
            <div className="flex items-start">
              <span className="text-purple-400 mr-1.5">•</span>
              <span><strong>Key Event</strong>: Next deployment set for tomorrow morning.</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "outlook",
      name: "Outlook",
      color: "from-blue-600 to-indigo-700",
      borderColor: "border-blue-600/20",
      glowColor: "rgba(59, 130, 246, 0.15)",
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V7h16v12zm-3-9h-2V8h2v2zm0 4h-2v-2h2v2zm-4-4h-2V8h2v2zm0 4h-2v-2h2v2z"/>
        </svg>
      ),
      sender: "calendar@outlook-corp.com",
      time: "05:00 PM",
      avatarText: "OL",
      avatarBg: "bg-blue-600/20 text-blue-300 border-blue-600/30",
      inputMessage: "Calendar conflict detected: Your 'Q3 Budget Review' (Tomorrow 11:00 AM - 12:00 PM) overlaps with 'Weekly Marketing Sync' (Tomorrow 11:30 AM - 12:30 PM).",
      aiAction: "Resolving Schedule Conflicts",
      aiType: "conflict",
      aiOutputTitle: "Outlook AI Intelligence",
      aiOutputContent: (
        <div className="space-y-3">
          <div className="p-2.5 bg-rose-500/10 rounded-lg border border-rose-500/25">
            <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block mb-1">Overlap Detected (30 Mins)</span>
            <p className="text-xs text-slate-300">
              Q3 Budget Review conflicts with Marketing Sync between 11:30 AM and 12:00 PM.
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/25">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block mb-1">AI Recommendation</span>
            <p className="text-xs text-slate-300 mb-2">
              Move 'Weekly Marketing Sync' to 1:00 PM. Host and 4 out of 5 participants are free.
            </p>
            <div className="flex space-x-2">
              <button className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-semibold transition">
                Propose Reschedule
              </button>
              <button className="py-1 px-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded text-[10px] transition">
                Ignore
              </button>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentChannel = channels.find(c => c.id === activeChannel) || channels[0];

  return (
    <div className="min-h-screen text-slate-200 bg-[#030712] relative overflow-hidden font-sans">
      
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/15 animate-pulse-glow z-0 pointer-events-none"></div>
      <div className="absolute top-[40%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900/15 animate-pulse-glow z-0 pointer-events-none" style={{ animationDelay: "2s" }}></div>
      <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[45%] rounded-full bg-indigo-900/10 animate-pulse-glow z-0 pointer-events-none" style={{ animationDelay: "4s" }}></div>
      
      {/* Background grid lines */}
      <div className="absolute inset-0 grid-bg opacity-45 pointer-events-none z-0"></div>

      {/* --- HEADER --- */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass shadow-xl py-3" : "bg-transparent py-5"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform duration-300">
              <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-purple-400 transition-colors duration-300">
              OmniSync<span className="text-purple-500">.ai</span>
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition duration-200">Features</a>
            <a href="#playground" className="text-sm text-slate-400 hover:text-white transition duration-200">Simulator</a>
            <a href="#workflow" className="text-sm text-slate-400 hover:text-white transition duration-200">How it Works</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition duration-200">Pricing</a>
            <a href="#faq" className="text-sm text-slate-400 hover:text-white transition duration-200">FAQ</a>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-white">{user.profile?.name || user.email.split("@")[0]}</span>
                  <span className="text-[10px] text-slate-400">{user.email}</span>
                </div>
                <Link
                  href="/dashboard"
                  className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition duration-200 px-4 py-2 rounded-xl shadow-md shadow-purple-900/30"
                >
                  Dashboard
                </Link>
                <button 
                  onClick={signOut}
                  className="text-xs font-semibold text-slate-300 hover:text-white transition duration-200 px-3.5 py-2 glass rounded-xl border border-white/5 hover:border-white/10 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-semibold text-slate-300 hover:text-white transition duration-200 px-4 py-2">
                  Sign In
                </Link>
                <Link 
                  href="/sign-up" 
                  className="glow-on-hover relative px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-900/30 hover:shadow-purple-700/40 transform hover:-translate-y-0.5 transition duration-200 text-center"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white focus:outline-none"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 py-6 px-6 glass border-t border-white/5 flex flex-col space-y-4 shadow-2xl animate-fade-in">
            <a 
              href="#features" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-slate-300 hover:text-white transition py-1"
            >
              Features
            </a>
            <a 
              href="#playground" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-slate-300 hover:text-white transition py-1"
            >
              Simulator
            </a>
            <a 
              href="#workflow" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-slate-300 hover:text-white transition py-1"
            >
              How it Works
            </a>
            <a 
              href="#pricing" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-slate-300 hover:text-white transition py-1"
            >
              Pricing
            </a>
            <a 
              href="#faq" 
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-slate-300 hover:text-white transition py-1"
            >
              FAQ
            </a>
            <div className="h-px bg-white/10 my-2"></div>
            <div className="flex flex-col space-y-3 pt-2">
              {user ? (
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-col p-2.5 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-sm font-bold text-white">{user.profile?.name || user.email.split("@")[0]}</span>
                    <span className="text-xs text-slate-400 mt-0.5">{user.email}</span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl"
                  >
                    Go to Dashboard
                  </Link>
                  <button 
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition bg-white/5 border border-white/5 rounded-xl cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Link 
                    href="/sign-in"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition"
                  >
                    Sign In
                  </Link>
                  <Link 
                    href="/sign-up"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full text-center py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-xl"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* --- HERO SECTION --- */}
      <section className="pt-32 pb-24 md:pt-44 md:pb-32 relative z-10 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
        {/* Intro Badge */}
        <div className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full glass border border-purple-500/20 mb-8 animate-float">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
          <span className="text-xs font-semibold text-purple-300 tracking-wide">Introducing OmniSync 1.0</span>
          <span className="text-slate-500">|</span>
          <span className="text-xs text-indigo-300 flex items-center">
            Integrate Gmail, WhatsApp, Telegram, Outlook
          </span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] max-w-5xl mb-8">
          Your AI Chief of Staff. <br />
          <span className="text-gradient-purple-blue">Connected to your conversations.</span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed mb-10">
          Unify your WhatsApp, Telegram, Gmail, and Outlook into a secure cognitive intelligence workspace. Get automated digests, context-aware drafts, calendar conflict resolutions, and smart reminders instantly.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md mb-16">
          <Link 
            href={user ? "/dashboard" : "/sign-up"} 
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-purple-900/40 hover:shadow-purple-700/50 transform hover:-translate-y-0.5 transition duration-200 text-center"
          >
            {user ? "Go to Dashboard" : "Start Free Trial"}
          </Link>
          <a 
            href="#playground" 
            className="w-full sm:w-auto px-8 py-4 glass hover:bg-white/5 border border-white/10 text-white font-semibold rounded-xl transition duration-200 text-center flex items-center justify-center space-x-2"
          >
            <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Trust Badges & Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 w-full max-w-4xl py-6 border-t border-b border-white/5 bg-white/[0.01] backdrop-blur-sm rounded-2xl px-8">
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">100k+</span>
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider mt-1">Digests Processed</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">98.4%</span>
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider mt-1">Accuracy Rating</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">&lt; 1.2s</span>
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider mt-1">Latency Speed</span>
          </div>
          <div className="flex flex-col items-center justify-center">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">AES-256</span>
            <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider mt-1">E2E Encryption</span>
          </div>
        </div>

        {/* Visual Mockup Overlay */}
        <div className="w-full max-w-5xl mt-20 relative rounded-2xl border border-white/10 overflow-hidden bg-[#0a0f1d] shadow-2xl shadow-purple-900/20 group">
          <div className="absolute top-0 left-0 right-0 h-10 bg-slate-900/80 border-b border-white/5 flex items-center px-4 space-x-2">
            <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            <div className="flex-1 flex justify-center">
              <div className="w-64 h-5 rounded bg-white/5 border border-white/5 flex items-center justify-center">
                <span className="text-[10px] text-slate-500">omnisync.ai/dashboard/overview</span>
              </div>
            </div>
          </div>
          
          <div className="pt-10 px-4 pb-4 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
            {/* Sidebar Mock */}
            <div className="hidden md:block col-span-1 border-r border-white/5 pr-6 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Connected Accounts</span>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-white flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Gmail
                    </span>
                    <span className="text-[10px] text-slate-400">Syncing</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-white flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> WhatsApp
                    </span>
                    <span className="text-[10px] text-slate-400">Syncing</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-white flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Telegram
                    </span>
                    <span className="text-[10px] text-slate-400">Syncing</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-xs text-white flex items-center">
                      <span className="w-2 h-2 rounded-full bg-rose-500 mr-2"></span> Outlook
                    </span>
                    <span className="text-[10px] text-slate-400">Paused</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Agent Tasks</span>
                <div className="space-y-1">
                  <div className="text-xs text-slate-400 flex items-center p-1.5">
                    <svg className="w-3.5 h-3.5 mr-2 text-purple-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Summarizing Slack logs
                  </div>
                  <div className="text-xs text-slate-400 flex items-center p-1.5">
                    <svg className="w-3.5 h-3.5 mr-2 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Drafting client updates
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Content Mock */}
            <div className="col-span-1 md:col-span-3 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/5 pb-4 gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {user ? `Daily Briefing for ${user.profile?.name || user.email.split("@")[0]}` : "Daily Intelligence Briefing"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {user ? "Personalized agent briefings synced live" : "Aggregated from all active communication streams"}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <span className="px-2.5 py-1 text-[10px] font-semibold bg-purple-900/40 text-purple-300 rounded-md border border-purple-500/20">
                    5 Critical Notifications
                  </span>
                  <span className="px-2.5 py-1 text-[10px] font-semibold bg-emerald-950 text-emerald-400 rounded-md border border-emerald-500/20">
                    Agent Active
                  </span>
                </div>
              </div>

              {/* Mock Feed Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mock Card 1 */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 relative hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-xs text-emerald-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span> WhatsApp Smart Reminder
                    </span>
                    <span className="text-[10px] text-slate-500">2m ago</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    "Hey, send me the slides before our 5 PM call" - John
                  </p>
                  <div className="p-2.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20 flex justify-between items-center">
                    <div>
                      <p className="text-[11px] font-semibold text-white">Send Pitch Slides to John</p>
                      <p className="text-[9px] text-indigo-300">Today, 4:45 PM (Reminder Set)</p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Synced</span>
                  </div>
                </div>

                {/* Mock Card 2 */}
                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-3 relative hover:border-white/10 transition-colors">
                  <div className="flex justify-between items-center">
                    <span className="flex items-center text-xs text-red-400 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mr-1.5"></span> Gmail Urgent Action
                    </span>
                    <span className="text-[10px] text-slate-500">14m ago</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    "We need to review and sign the NDA before onboarding the contractors..."
                  </p>
                  <div className="flex space-x-2 pt-1">
                    <button className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-semibold transition">
                      Draft NDA Response
                    </button>
                    <button className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[10px] transition">
                      Forward NDA
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom activity log mockup */}
              <div className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center">
                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2 animate-pulse"></span>
                  AI analyzed 14 conversations and extracted 3 tasks in the last 15 minutes.
                </span>
                <a href="#playground" className="text-purple-400 font-semibold hover:underline">Test in simulator &rarr;</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- BENTO GRID FEATURES SECTION --- */}
      <section id="features" className="py-24 relative z-10 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Core Capabilities</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            A unified cognitive layer for your communication tools
          </h3>
          <p className="text-slate-400 text-base sm:text-lg">
            Say goodbye to jumping between messaging apps, emails, and calendar schedules. OmniSync handles it all automatically.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Unified Hub (Large/Wide) */}
          <div className="md:col-span-2 glass-premium rounded-2xl p-8 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full bg-purple-900/10 filter blur-3xl pointer-events-none group-hover:bg-purple-900/20 transition-all duration-500"></div>
            
            <div className="space-y-4 z-10 max-w-md">
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-purple-500/15 text-purple-300 rounded-md border border-purple-500/20 inline-block">
                Orchestrator
              </span>
              <h4 className="text-xl sm:text-2xl font-bold text-white">Central Integration Orbit</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Connect your workspace in minutes. Our AI sync engine establishes a secure bridge with Telegram, WhatsApp, Gmail, and Outlook, routing notifications through a private local intelligence processor.
              </p>
            </div>

            {/* Simulated Animated Graph */}
            <div className="mt-8 relative h-48 w-full flex items-center justify-center z-10 bg-white/[0.01] rounded-xl border border-white/5 overflow-hidden">
              {/* Central Core */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 z-20 animate-float">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              {/* Orbit Icons */}
              <div className="absolute left-[15%] top-[25%] p-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 animate-float-delayed">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
              </div>
              <div className="absolute left-[20%] bottom-[20%] p-3 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 animate-float">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/>
                </svg>
              </div>
              <div className="absolute right-[15%] top-[20%] p-3 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-float">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.62.15-.15 2.72-2.5 2.77-2.7.01-.03.01-.15-.06-.21-.07-.06-.17-.04-.25-.02-.11.02-1.92 1.22-5.43 3.59-.51.35-.98.53-1.4.51-.46-.01-1.35-.26-2.01-.48-.81-.27-1.46-.42-1.4-.88.03-.24.36-.49.99-.75 3.87-1.68 6.45-2.79 7.74-3.33 3.68-1.54 4.44-1.81 4.94-1.82.11 0 .36.03.52.16.14.11.18.26.19.37 0 .07-.01.21-.02.28z"/>
                </svg>
              </div>
              <div className="absolute right-[20%] bottom-[25%] p-3 rounded-full bg-sky-600/10 text-sky-400 border border-sky-600/20 animate-float-delayed">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H4V7h16v12zm-3-9h-2V8h2v2zm0 4h-2v-2h2v2zm-4-4h-2V8h2v2zm0 4h-2v-2h2v2z"/>
                </svg>
              </div>

              {/* Pulsing connections */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <line x1="20%" y1="35%" x2="50%" y2="50%" stroke="white" strokeWidth="1.5" strokeDasharray="5,5" className="animate-pulse" />
                <line x1="23%" y1="75%" x2="50%" y2="50%" stroke="white" strokeWidth="1.5" strokeDasharray="5,5" className="animate-pulse" />
                <line x1="82%" y1="30%" x2="50%" y2="50%" stroke="white" strokeWidth="1.5" strokeDasharray="5,5" className="animate-pulse" />
                <line x1="77%" y1="68%" x2="50%" y2="50%" stroke="white" strokeWidth="1.5" strokeDasharray="5,5" className="animate-pulse" />
              </svg>
            </div>
          </div>

          {/* Card 2: AI Summaries (Standard) */}
          <div className="glass-premium rounded-2xl p-8 flex flex-col justify-between hover:border-white/10 transition duration-300">
            <div className="space-y-4">
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 rounded-md border border-amber-500/20 inline-block">
                Cognitive
              </span>
              <h4 className="text-xl font-bold text-white">Smart Digests</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Condense hundreds of WhatsApp chat logs or long Outlook threads into three actionable points. You get high-level bullet summaries that highlight exact requests, action items, and schedules.
              </p>
            </div>

            <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl space-y-2 text-xs">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Telegram Digest</span>
              <p className="text-slate-300 line-through opacity-45">11:15 AM - Client: Let's adjust the deadline to...</p>
              <p className="text-slate-300 line-through opacity-45">11:18 AM - Designer: Sounds good. Let's send it...</p>
              <div className="border-t border-white/5 pt-2 mt-2 space-y-1">
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider block">AI Summary</span>
                <p className="text-white text-xs font-semibold">📍 Client deadline moved to Friday</p>
                <p className="text-white text-xs font-semibold">📍 Need to submit design assets by 5 PM</p>
              </div>
            </div>
          </div>

          {/* Card 3: Reminders Engine (Standard) */}
          <div className="glass-premium rounded-2xl p-8 flex flex-col justify-between hover:border-white/10 transition duration-300">
            <div className="space-y-4">
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 rounded-md border border-emerald-500/20 inline-block">
                Automation
              </span>
              <h4 className="text-xl font-bold text-white">Zero-Click Reminders</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Never drop a promise again. OmniSync automatically detects casual commitments like "I'll call you at 4 PM" or "Sending document tonight", sending push reminders to keep you on schedule.
              </p>
            </div>

            <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs flex items-center justify-between">
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase">Extracted Commitment</p>
                <h5 className="font-semibold text-white mt-0.5">Call Sarah (Q2 Deliverables)</h5>
                <p className="text-[10px] text-purple-400 mt-0.5">Tomorrow, 3:00 PM</p>
              </div>
              <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                Scheduled
              </span>
            </div>
          </div>

          {/* Card 4: Privacy & Security (Large/Wide) */}
          <div className="md:col-span-2 glass-premium rounded-2xl p-8 flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] rounded-full bg-blue-900/10 filter blur-3xl pointer-events-none group-hover:bg-blue-900/20 transition-all duration-500"></div>

            <div className="space-y-4 z-10 max-w-md">
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/15 text-emerald-300 rounded-md border border-emerald-500/20 inline-block">
                Security
              </span>
              <h4 className="text-xl sm:text-2xl font-bold text-white">Local-First Privacy Guard</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your messages belong to you. OmniSync runs on a local-first architecture. It processes texts directly in secure enclaves using AES-256 encryption. We never store, read, or sell your private conversation data.
              </p>
            </div>

            {/* Simulated Settings Panel */}
            <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl z-10 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <span className="text-white font-semibold">Privacy Preferences</span>
                <span className="text-[10px] text-slate-500">Secure Storage: ACTIVE</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                    End-to-End Chat Encryption
                  </span>
                  <div className="w-8 h-4 rounded-full bg-emerald-600 p-0.5 cursor-pointer">
                    <div className="w-3 h-3 rounded-full bg-white ml-4 transition-all"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    Local LLM Sync (Offline Mode)
                  </span>
                  <div className="w-8 h-4 rounded-full bg-emerald-600 p-0.5 cursor-pointer">
                    <div className="w-3 h-3 rounded-full bg-white ml-4 transition-all"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 flex items-center">
                    <svg className="w-3.5 h-3.5 mr-1.5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                    Anonymize email bodies
                  </span>
                  <div className="w-8 h-4 rounded-full bg-emerald-600 p-0.5 cursor-pointer">
                    <div className="w-3 h-3 rounded-full bg-white ml-4 transition-all"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Smart Replies (Standard) */}
          <div className="glass-premium rounded-2xl p-8 flex flex-col justify-between hover:border-white/10 transition duration-300">
            <div className="space-y-4">
              <span className="px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase bg-indigo-500/15 text-indigo-300 rounded-md border border-indigo-500/20 inline-block">
                Interactions
              </span>
              <h4 className="text-xl font-bold text-white">Context-Aware Replies</h4>
              <p className="text-slate-400 text-sm leading-relaxed">
                Reply to client emails or contractor WhatsApps using custom-tailored drafts. Our AI reads past context and models your unique tone of voice, letting you dispatch replies with a single click.
              </p>
            </div>

            <div className="mt-8 p-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs space-y-2">
              <div className="flex justify-between items-center text-[10px] text-slate-500">
                <span>Suggested Draft</span>
                <span className="text-emerald-400 font-bold">96% Match</span>
              </div>
              <p className="text-slate-200 italic leading-relaxed">
                "Got it. I'll review the contract and get back to you by Monday."
              </p>
              <div className="flex justify-end space-x-2 pt-1">
                <button className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-semibold transition">
                  Insert Reply
                </button>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* --- INTERACTIVE SIMULATOR (PLAYGROUND) --- */}
      <section id="playground" className="py-24 relative z-10 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Live Simulation</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Test the AI Sync Engine in Real-Time
          </h3>
          <p className="text-slate-400 text-base sm:text-lg">
            Select an incoming channel, see the raw notification text, and run the simulator to watch how the cognitive layer extracts summaries, draft replies, or calendar events.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Channel Selectors - Left side */}
          <div className="lg:col-span-3 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0">
            {channels.map((ch) => {
              const isActive = activeChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannel(ch.id);
                    setIsPlaying(false);
                    setPlayProgress(0);
                    setShowAiResult(false);
                  }}
                  className={`flex-1 min-w-[120px] lg:w-full flex items-center space-x-3 p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer ${isActive ? "bg-white/5 border-purple-500/40 shadow-lg shadow-purple-950/10" : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03] hover:border-white/10"}`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${ch.color} flex items-center justify-center text-white`}>
                    {ch.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{ch.name}</h4>
                    <span className="text-[10px] text-slate-500">Demo Sync</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Simulator Console - Right side */}
          <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 md:p-8 glass-premium rounded-3xl border border-white/5 relative">
            
            {/* Input Message Panel (Raw Stream) */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="text-xs font-bold text-slate-400 flex items-center">
                    <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${currentChannel.color} mr-2`}></span>
                    Incoming Notification: {currentChannel.name}
                  </span>
                  <span className="text-[11px] text-slate-500">{currentChannel.time}</span>
                </div>
                
                {/* Chat Bubble Simulation */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3 shadow-inner">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${currentChannel.avatarBg}`}>
                      {currentChannel.avatarText}
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-white">{currentChannel.sender}</h5>
                      <span className="text-[9px] text-slate-500">via API Gateway</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed italic bg-black/20 p-3 rounded-xl border border-white/[0.02]">
                    "{currentChannel.inputMessage}"
                  </p>
                </div>
              </div>

              {/* Trigger Button */}
              <div className="pt-4 space-y-3">
                <button
                  onClick={triggerSimulation}
                  disabled={isPlaying}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-sm transition duration-200 cursor-pointer flex items-center justify-center space-x-2.5 ${isPlaying ? "bg-purple-950 text-purple-300 border border-purple-500/25" : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/30"}`}
                >
                  {isPlaying ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{currentChannel.aiAction}...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                      </svg>
                      <span>Analyze with OmniSync AI</span>
                    </>
                  )}
                </button>
                <p className="text-[10px] text-center text-slate-500">
                  Processes locally using secure cognitive pathways.
                </p>
              </div>
            </div>

            {/* AI Engine Processing / Output Panel */}
            <div className="border-t md:border-t-0 md:border-l border-white/5 pt-6 md:pt-0 md:pl-6 flex flex-col justify-between min-h-[300px]">
              <div className="space-y-4 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold text-slate-400 flex items-center">
                      <svg className="w-3.5 h-3.5 mr-1.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI Core Output
                    </span>
                    {showAiResult && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/25 text-emerald-400 font-medium animate-fade-in border border-emerald-500/30">
                        Completed
                      </span>
                    )}
                  </div>

                  {/* Processing Progress State */}
                  {isPlaying && (
                    <div className="h-full flex flex-col items-center justify-center py-12 space-y-4 animate-pulse">
                      <div className="w-14 h-14 rounded-full border-2 border-dashed border-purple-500 animate-spin flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                          <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        </div>
                      </div>
                      <div className="w-full max-w-[200px] bg-white/5 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full transition-all duration-100" style={{ width: `${playProgress}%` }}></div>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">Analyzing parameters...</span>
                    </div>
                  )}

                  {/* Idle State */}
                  {!isPlaying && !showAiResult && (
                    <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400">AI Engine Standby</p>
                        <p className="text-[11px] text-slate-600 mt-1 max-w-[200px]">Click 'Analyze with OmniSync AI' to trigger the parser.</p>
                      </div>
                    </div>
                  )}

                  {/* Completed Output State */}
                  {showAiResult && (
                    <div className="animate-fade-in p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                          {currentChannel.aiOutputTitle}
                        </span>
                        <span className="text-[9px] text-purple-400 font-bold">142ms Latency</span>
                      </div>
                      
                      {currentChannel.aiOutputContent}
                    </div>
                  )}
                </div>

                {/* Simulated Notification Indicator */}
                {showAiResult && (
                  <div className="mt-4 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/25 flex items-center justify-between text-[11px] animate-fade-in">
                    <span className="text-emerald-400 font-semibold flex items-center">
                      <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4"/></svg>
                      Agent synced with system notification service.
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (WORKFLOW) --- */}
      <section id="workflow" className="py-24 relative z-10 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Onboarding</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Setup your Assistant in 3 Steps
          </h3>
          <p className="text-slate-400 text-base sm:text-lg">
            No complex developer API configurations. We leverage secure direct integrations to connect your accounts seamlessly.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-0.5 bg-gradient-to-r from-purple-500/30 via-indigo-500/20 to-blue-500/30 z-0"></div>

          {/* Step 1 */}
          <div className="flex flex-col items-center text-center relative z-10 space-y-5 group">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-purple-500/30 flex items-center justify-center text-xl font-extrabold text-white shadow-lg transition duration-300 group-hover:scale-105 relative">
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-purple-600/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              01
            </div>
            <h4 className="text-lg font-bold text-white">Securely Connect</h4>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Authenticate your Gmail, Outlook, Telegram, and WhatsApp accounts via our secure sandboxed OAuth gateways.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center relative z-10 space-y-5 group">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-indigo-500/30 flex items-center justify-center text-xl font-extrabold text-white shadow-lg transition duration-300 group-hover:scale-105 relative">
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-indigo-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              02
            </div>
            <h4 className="text-lg font-bold text-white">Define Rules</h4>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Set priority alerts, select channels for digests, and customize your agent's tone of voice for reply suggestions.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center relative z-10 space-y-5 group">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/5 group-hover:border-blue-500/30 flex items-center justify-center text-xl font-extrabold text-white shadow-lg transition duration-300 group-hover:scale-105 relative">
              <span className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600/10 to-pink-600/10 opacity-0 group-hover:opacity-100 transition-opacity"></span>
              03
            </div>
            <h4 className="text-lg font-bold text-white">Reclaim Your Focus</h4>
            <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
              Receive smart summaries via push notification or calendar briefs. Watch reminders sync and drafts compile automatically.
            </p>
          </div>

        </div>
      </section>

      {/* --- PRICING SECTION --- */}
      <section id="pricing" className="py-24 relative z-10 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Subscription</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-4">
            Pricing Plans for Every Workflow
          </h3>
          <p className="text-slate-400 text-base sm:text-lg">
            Start free and scale up as your communication volumes increase. Cancel or switch plans at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
          
          {/* Plan 1: Free */}
          <div className="glass-premium rounded-2xl p-8 flex flex-col justify-between hover:border-white/10 transition duration-300 relative">
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-white">Starter</h4>
                <p className="text-xs text-slate-500 mt-1">For testing and light usage</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$0</span>
                <span className="text-slate-500 text-xs ml-2">/ month</span>
              </div>
              <div className="h-px bg-white/5"></div>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Connect 2 Accounts
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  50 AI Summaries / month
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Basic Reminder Syncing
                </li>
                <li className="flex items-center text-slate-600 line-through">
                  <svg className="w-3.5 h-3.5 text-slate-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  Context-Aware Reply Suggestions
                </li>
                <li className="flex items-center text-slate-600 line-through">
                  <svg className="w-3.5 h-3.5 text-slate-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  Local Offline LLM Execution
                </li>
              </ul>
            </div>
            <button className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition cursor-pointer">
              Get Started
            </button>
          </div>

          {/* Plan 2: Pro (Premium featured) */}
          <div className="glass-premium rounded-2xl p-8 flex flex-col justify-between border-purple-500/30 hover:border-purple-500/50 transition duration-300 relative shadow-xl shadow-purple-950/20 transform md:-translate-y-3">
            {/* Best Value Badge */}
            <div className="absolute top-0 right-8 transform -translate-y-1/2 px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-extrabold tracking-wider uppercase rounded-full shadow-md shadow-purple-900/30">
              Most Popular
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-white">Professional</h4>
                <p className="text-xs text-purple-300 mt-1">For active power users</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-white">$19</span>
                <span className="text-slate-500 text-xs ml-2">/ month</span>
              </div>
              <div className="h-px bg-white/5"></div>
              <ul className="space-y-3 text-xs text-slate-300">
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Connect Unlimited Accounts
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Unlimited AI Digests & Summaries
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Real-time Calendar conflict sync
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  AI Tone-Matched Suggested Replies
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Secure Local processing enclave
                </li>
              </ul>
            </div>
            <button className="w-full mt-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-900/30 cursor-pointer">
              Start 14-Day Free Trial
            </button>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="glass-premium rounded-2xl p-8 flex flex-col justify-between hover:border-white/10 transition duration-300 relative">
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-bold text-white">Enterprise</h4>
                <p className="text-xs text-slate-500 mt-1">For corporate teams & compliance</p>
              </div>
              <div className="flex items-baseline">
                <span className="text-4xl font-extrabold text-white">Custom</span>
              </div>
              <div className="h-px bg-white/5"></div>
              <ul className="space-y-3 text-xs text-slate-400">
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Custom SSO & Identity sync
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Private LLM deployments (VPC/On-prem)
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Custom SLA & 24/7 Phone Support
                </li>
                <li className="flex items-center">
                  <svg className="w-3.5 h-3.5 text-emerald-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                  Granular permission auditer tools
                </li>
              </ul>
            </div>
            <button className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition cursor-pointer">
              Contact Sales
            </button>
          </div>

        </div>
      </section>

      {/* --- FAQ SECTION --- */}
      <section id="faq" className="py-24 relative z-10 px-6 max-w-4xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <h2 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">Questions</h2>
          <h3 className="text-3xl sm:text-4xl font-extrabold text-white">
            Frequently Asked Questions
          </h3>
        </div>

        <div className="space-y-4">
          {[
            {
              q: "How secure is my connected account data?",
              a: "We prioritize your privacy above all. OmniSync utilizes bank-grade OAuth connections to sync your channels. All cognitive summaries and reply draft processing are performed inside secure sandboxed execution enclaves. Your data is encrypted in transit and at rest using AES-256 protocols."
            },
            {
              q: "Does the AI read all my private chats continuously?",
              a: "No. OmniSync's listener engine parses raw metadata streams to identify target tasks. It only processes message body text when specific events occur (e.g., extracting reminders, creating requested summaries, or drafting answers). You have granular control to pause syncing on any chat, channel, or email at any moment."
            },
            {
              q: "Can I sync multiple Gmail or Outlook accounts?",
              a: "Yes! With our Professional plan, you can connect as many business or personal Gmail and Outlook workspaces as you need. All accounts are pooled into a single daily dashboard overview so you can track all action items in one spot."
            },
            {
              q: "Does it support voice messages in WhatsApp or Telegram?",
              a: "Yes! OmniSync features built-in high-accuracy speech-to-text translators. When you receive a long voice message, the system transcribes it locally and supplies a text digest so you can grasp the key points without listening to the audio."
            }
          ].map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div 
                key={index} 
                className="glass rounded-xl border border-white/5 overflow-hidden transition-all duration-300"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full py-5 px-6 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-bold text-white">{faq.q}</span>
                  <svg 
                    className={`w-5 h-5 text-purple-400 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? "max-h-[250px] opacity-100 border-t border-white/5" : "max-h-0 opacity-0"}`}
                >
                  <div className="p-6 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {faq.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- WAITLIST / CALL TO ACTION (CTA) --- */}
      <section id="waitlist" className="py-24 relative z-10 px-6 max-w-5xl mx-auto text-center border-t border-white/5">
        <div className="glass-premium rounded-3xl p-8 sm:p-12 md:p-16 relative overflow-hidden">
          <div className="absolute top-[-40%] left-[-20%] w-[400px] h-[400px] rounded-full bg-purple-900/10 filter blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-[-40%] right-[-20%] w-[400px] h-[400px] rounded-full bg-blue-900/10 filter blur-3xl pointer-events-none"></div>
          
          <div className="max-w-2xl mx-auto space-y-8 relative z-10">
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Ready to reclaim <br className="sm:hidden" /> your focus?
            </h3>
            <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
              Join 1,400+ professionals using OmniSync AI to unify their messaging, emails, and reminders. Start your 14-day free trial today.
            </p>

            {waitlistStatus === "success" ? (
              <div className="p-6 bg-purple-500/10 rounded-2xl border border-purple-500/20 max-w-md mx-auto animate-fade-in space-y-2">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>
                </div>
                <h4 className="text-base font-bold text-white">You're on the list!</h4>
                <p className="text-xs text-slate-400">
                  Thank you for subscribing. We've sent a confirmation email to <span className="text-purple-300 font-semibold">{email}</span> with setup details.
                </p>
                <span className="inline-block text-[10px] text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full mt-2 font-bold">
                  Queue Position: #{waitlistCount}
                </span>
              </div>
            ) : (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col sm:flex-row items-stretch justify-center gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  placeholder="Enter your business email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl text-white text-sm focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={waitlistStatus === "loading"}
                  className="px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition transform active:scale-[0.98] cursor-pointer flex items-center justify-center"
                >
                  {waitlistStatus === "loading" ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    "Join the Waitlist"
                  )}
                </button>
              </form>
            )}

            <div className="flex items-center justify-center space-x-6 text-[11px] text-slate-500">
              <span className="flex items-center">
                <svg className="w-3.5 h-3.5 text-purple-400 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4"/></svg>
                No credit card required
              </span>
              <span className="flex items-center">
                <svg className="w-3.5 h-3.5 text-purple-400 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4"/></svg>
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 border-t border-white/5 relative z-10 pt-20 pb-8 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-6 gap-10 pb-16">
          {/* Brand Col */}
          <div className="col-span-2 space-y-6">
            <a href="#" className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow shadow-purple-900/30">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">OmniSync<span className="text-purple-500">.ai</span></span>
            </a>
            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              OmniSync AI brings clarity to your communication channels, orchestrating summaries, draft response suggests, and reminder calendar syncs.
            </p>
            <div className="flex space-x-4">
              {/* Social Link: Twitter */}
              <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition duration-200" aria-label="Twitter">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              {/* Social Link: GitHub */}
              <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition duration-200" aria-label="GitHub">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.197 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
              {/* Social Link: Discord */}
              <a href="#" className="p-2 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 text-slate-400 hover:text-white transition duration-200" aria-label="Discord">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.873-.894.077.077 0 01-.008-.128c.126-.093.252-.19.372-.287a.075.075 0 01.077-.011 13.985 13.985 0 0012.054 0 .076.076 0 01.078.01c.12.098.246.195.373.289a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.894.077.077 0 00-.041.107 14.362 14.362 0 001.226 1.99.075.075 0 00.084.03 19.856 19.856 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.156 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.156-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.156 2.418z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Col 1 */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Product</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#features" className="hover:text-white transition">Features</a></li>
              <li><a href="#playground" className="hover:text-white transition">Live Simulator</a></li>
              <li><a href="#pricing" className="hover:text-white transition">Pricing Plans</a></li>
              <li><a href="#workflow" className="hover:text-white transition">How it Works</a></li>
              <li><a href="#" className="hover:text-white transition">Release Notes</a></li>
            </ul>
          </div>

          {/* Links Col 2 */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Integrations</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#" className="hover:text-white transition flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>Gmail</a></li>
              <li><a href="#" className="hover:text-white transition flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>WhatsApp</a></li>
              <li><a href="#" className="hover:text-white transition flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-sky-500 mr-2"></span>Telegram</a></li>
              <li><a href="#" className="hover:text-white transition flex items-center"><span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2"></span>Outlook</a></li>
              <li><a href="#" className="hover:text-white transition text-slate-600 flex items-center">Slack (Soon)</a></li>
            </ul>
          </div>

          {/* Links Col 3 */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Resources</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#" className="hover:text-white transition">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition">API Status</a></li>
              <li><a href="#" className="hover:text-white transition">Security Guide</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
            </ul>
          </div>

          {/* Links Col 4 */}
          <div className="space-y-4">
            <h5 className="text-xs font-bold text-white uppercase tracking-wider">Company</h5>
            <ul className="space-y-2 text-xs text-slate-400">
              <li><a href="#" className="hover:text-white transition">About Us</a></li>
              <li><a href="#" className="hover:text-white transition flex items-center">Careers <span className="ml-1.5 text-[8px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Hiring</span></a></li>
              <li><a href="#" className="hover:text-white transition">Blog</a></li>
              <li><a href="#" className="hover:text-white transition">Press Kit</a></li>
              <li><a href="#" className="hover:text-white transition">Contact Support</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Credits */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <span>&copy; {new Date().getFullYear()} OmniSync AI Inc. All rights reserved.</span>
          <div className="flex space-x-6">
            <a href="#" className="hover:text-slate-300 transition">Privacy Shield</a>
            <a href="#" className="hover:text-slate-300 transition">CCPA Data Privacy</a>
            <a href="#" className="hover:text-slate-300 transition">GDPR Compliance</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
