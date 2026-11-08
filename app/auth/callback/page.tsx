"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { insforge } from "@/lib/insforge";
import { useAuth } from "@/components/auth-provider";

export default function AuthCallback() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Retrieve the current user. The SDK automatically processes
        // query parameters (e.g. insforge_code) when calling getCurrentUser.
        const { data, error: userError } = await insforge.auth.getCurrentUser();
        
        if (userError) {
          throw userError;
        }

        if (data?.user) {
          // Double-check if the user's database sync was triggered.
          // refreshUser will retrieve the current user and perform the database sync.
          await refreshUser();
          router.push("/");
        } else {
          // Check query parameters for explicit errors from the server redirect
          const params = new URLSearchParams(window.location.search);
          const insforgeError = params.get("insforge_error");
          
          if (insforgeError) {
            setError(insforgeError);
          } else {
            setError("Could not retrieve your user session. Please try signing in again.");
          }
        }
      } catch (err: any) {
        console.error("Auth callback exception:", err);
        setError(err.message || "An error occurred during authentication.");
      }
    };

    handleCallback();
  }, [router, refreshUser]);

  return (
    <div className="min-h-screen text-slate-200 bg-[#030712] relative overflow-hidden font-sans flex items-center justify-center px-6">
      {/* Background ambient glows */}
      <div className="absolute top-[30%] left-[30%] w-[40%] h-[40%] rounded-full bg-purple-900/10 filter blur-3xl pointer-events-none animate-pulse"></div>
      
      {/* Background grid lines */}
      <div className="absolute inset-0 grid-bg opacity-30 pointer-events-none z-0"></div>

      <div className="w-full max-w-sm glass-premium rounded-3xl p-8 relative z-10 text-center space-y-6 border border-white/5 shadow-2xl">
        {error ? (
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white">Authentication Failed</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
            <button
              onClick={() => router.push("/sign-in")}
              className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold border border-white/5 transition"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <div className="py-6 space-y-4">
            <div className="w-14 h-14 rounded-full border-2 border-dashed border-purple-500 animate-spin flex items-center justify-center mx-auto">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Completing Sign In</h3>
              <p className="text-[11px] text-slate-500 mt-1">Establishing secure cognitive sync session...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
