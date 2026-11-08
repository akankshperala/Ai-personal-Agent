"use client";

import React, { useEffect, useState, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

function GmailCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setStatus("error");
      setErrorMessage(errorParam || "Access denied by Google.");
      return;
    }

    if (!code) {
      setStatus("error");
      setErrorMessage("No authorization code received from Google.");
      return;
    }

    // Wait until user session is loaded
    if (!user) {
      return;
    }

    if (exchangeStarted.current) {
      return;
    }

    const exchangeCode = async () => {
      exchangeStarted.current = true;

      try {
        const response = await fetch("/api/gmail-connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, userId: user.id })
        });

        const data = await response.json();

        if (!response.ok || data.error) {
          throw new Error(data.error || "Failed to exchange Google OAuth code.");
        }

        setStatus("success");
        await refreshUser();
        
        // Wait 1.5s to show checkmark then redirect
        setTimeout(() => {
          router.push("/dashboard?tab=integrations");
        }, 1500);

      } catch (err: any) {
        console.error("Gmail callback exchange exception:", err);
        setStatus("error");
        setErrorMessage(err.message || "An error occurred during account sync.");
      }
    };

    exchangeCode();
  }, [searchParams, user, router, refreshUser]);

  return (
    <div className="w-full max-w-sm glass-premium rounded-3xl p-8 relative z-10 text-center space-y-6 border border-white/5 shadow-2xl">
      {status === "loading" && (
        <div className="py-6 space-y-4">
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-purple-500 animate-spin flex items-center justify-center mx-auto">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Connecting Gmail Account</h3>
            <p className="text-[11px] text-slate-500 mt-1">Exchanging secure credentials with Google OAuth...</p>
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="py-6 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto scale-in">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Gmail Synced Successfully</h3>
            <p className="text-[11px] text-slate-500 mt-1">Returning you to the integrations panel...</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-white">Connection Failed</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{errorMessage}</p>
          <button
            onClick={() => router.push("/dashboard?tab=integrations")}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/5 transition"
          >
            Back to Integrations
          </button>
        </div>
      )}
    </div>
  );
}

export default function GmailCallbackPage() {
  return (
    <div className="min-h-screen text-slate-200 bg-[#030712] relative overflow-hidden font-sans flex items-center justify-center px-6">
      {/* Background glows */}
      <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-purple-900/10 filter blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none z-0"></div>

      <Suspense fallback={
        <div className="w-full max-w-sm glass-premium rounded-3xl p-8 text-center border border-white/5 shadow-2xl">
          <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs text-slate-500 animate-pulse">Initializing callback page...</p>
        </div>
      }>
        <GmailCallbackContent />
      </Suspense>
    </div>
  );
}
