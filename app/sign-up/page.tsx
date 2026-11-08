"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  signUpWithEmail,
  signInWithGoogle,
} from "@/app/actions";
import { useAuth } from "@/components/auth-provider";


type AuthMode = "credentials" | "phone";
type PhoneStep = "phone" | "otp";

export default function SignUp() {
  const router = useRouter();
  const { refreshUser, setPhoneUser } = useAuth();

  // Credential auth state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Phone auth state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneDisplayName, setPhoneDisplayName] = useState("");
  const [verifyMethod, setVerifyMethod] = useState<"sms" | "whatsapp">("sms");
  const [otpCode, setOtpCode] = useState("");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // UI state
  const [authMode, setAuthMode] = useState<AuthMode>("credentials");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    const result = await signUpWithEmail(email, password, name);

    if (!result.success) {
      throw new Error(result.error || "Account creation failed");
    }

    router.push("/sign-in?registered=true");
  } catch (err: any) {
    setError(err.message || "Failed to create account. Please try again.");
  } finally {
    setLoading(false);
  }
};

 const handleGoogleSignUp = async () => {
  setLoading(true);
  setError(null);

  try {
    await signInWithGoogle();
  } catch (err: any) {
    setError(err.message || "Failed to start Google Sign-Up.");
    setLoading(false);
  }
};

  const handleSendOtp = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a valid phone number with country code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/phone-auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), method: verifyMethod }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to send OTP");

      if (data.otp) setDevOtp(data.otp);
      setPhoneStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError("Please enter the 6-digit OTP code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/phone-auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          otp: otpCode.trim(),
          method: verifyMethod,
          name: phoneDisplayName.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "OTP verification failed");

      setPhoneUser({
        id: data.user.id,
        name: data.user.name,
        phone: data.user.phone,
        auth_provider: "phone",
        verification_method: verifyMethod,
      });

      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetPhoneFlow = () => {
    setPhoneStep("phone");
    setOtpCode("");
    setDevOtp(null);
    setError(null);
  };

  return (
    <div className="min-h-screen text-slate-200 bg-[#030712] relative overflow-hidden font-sans flex items-center justify-center px-6 py-12">
      {/* Background ambient glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/15 animate-pulse-glow z-0 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/15 animate-pulse-glow z-0 pointer-events-none" style={{ animationDelay: "2s" }}></div>

      {/* Background grid lines */}
      <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none z-0"></div>

      {/* Main Container */}
      <div className="w-full max-w-md glass-premium rounded-3xl p-8 sm:p-10 relative z-10 shadow-2xl shadow-purple-950/20 border border-white/5">
        {/* Brand/Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center space-x-2.5 group mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-900/40 group-hover:scale-105 transition-transform duration-300">
              <svg className="w-5 h-5 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-purple-400 transition-colors duration-300">
              OmniSync<span className="text-purple-500">.ai</span>
            </span>
          </Link>
          <h2 className="text-xl font-bold text-white tracking-tight">Create Account</h2>
          <p className="text-slate-400 text-xs mt-1.5 text-center">
            Sign up to build your unified cognitive workspace.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20 text-xs text-rose-400 mb-6 flex items-start space-x-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Dev OTP hint */}


        {/* Auth Mode Toggle */}
        <div className="flex rounded-xl bg-white/5 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setAuthMode("credentials"); setError(null); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-200 ${authMode === "credentials"
              ? "bg-purple-600 text-white shadow"
              : "text-slate-400 hover:text-white"
              }`}
          >
            Email / Google
          </button>
          <button
            type="button"
            onClick={() => { setAuthMode("phone"); setError(null); resetPhoneFlow(); }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition duration-200 flex items-center justify-center space-x-1.5 ${authMode === "phone"
              ? "bg-purple-600 text-white shadow"
              : "text-slate-400 hover:text-white"
              }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <span>Phone OTP</span>
          </button>
        </div>

        {/* ─── Credentials Mode ─── */}
        {authMode === "credentials" && (
          <>
            <button
              onClick={handleGoogleSignUp}
              disabled={loading}
              type="button"
              className="w-full flex items-center justify-center space-x-2.5 py-3 px-4 bg-white/5 hover:bg-white/10 active:bg-white/5 border border-white/10 hover:border-white/20 rounded-xl text-slate-200 text-sm font-semibold transition duration-200 cursor-pointer shadow-md mb-6"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              <span>Register with Google</span>
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-3">or email details</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Display Name</label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl text-white text-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  disabled={loading}
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl text-white text-sm focus:outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl text-white text-sm focus:outline-none transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm transition duration-200 transform active:scale-[0.98] cursor-pointer flex items-center justify-center"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : "Create Account"}
              </button>
            </form>
          </>
        )}

        {/* ─── Phone OTP Mode ─── */}
        {authMode === "phone" && (
          <div className="space-y-5">
            {phoneStep === "phone" && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Display Name <span className="text-slate-600 font-normal normal-case">(optional)</span>
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    placeholder="John Doe"
                    value={phoneDisplayName}
                    onChange={(e) => setPhoneDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl text-white text-sm focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    disabled={loading}
                    placeholder="+1 234 567 8900"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl text-white text-sm focus:outline-none transition"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5">Include country code, e.g. +1 for US</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Verification Method
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setVerifyMethod("sms")}
                      className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl border transition duration-200 ${verifyMethod === "sms"
                        ? "border-purple-500 bg-purple-500/10 text-purple-400"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                        }`}
                    >
                      <svg className="w-5 h-5 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="text-xs font-semibold">SMS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifyMethod("whatsapp")}
                      className={`flex flex-col items-center justify-center py-4 px-3 rounded-xl border transition duration-200 ${verifyMethod === "whatsapp"
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white"
                        }`}
                    >
                      <svg className="w-5 h-5 mb-1.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span className="text-xs font-semibold">WhatsApp</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={loading || !phoneNumber.trim()}
                  onClick={handleSendOtp}
                  className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition duration-200 transform active:scale-[0.98] cursor-pointer flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <>Send OTP via {verifyMethod === "whatsapp" ? "WhatsApp" : "SMS"}</>
                  )}
                </button>
              </>
            )}

            {phoneStep === "otp" && (
              <>
                <div className="text-center mb-2">
                  <div className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mb-3 ${verifyMethod === "whatsapp" ? "bg-emerald-500/15 text-emerald-400" : "bg-blue-500/15 text-blue-400"
                    }`}>
                    {verifyMethod === "whatsapp" ? (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    )}
                    <span>OTP sent via {verifyMethod === "whatsapp" ? "WhatsApp" : "SMS"}</span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    We sent a 6-digit code to <span className="text-white font-semibold">{phoneNumber}</span>
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    disabled={loading}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl text-white text-sm text-center tracking-[0.5em] font-mono focus:outline-none transition"
                  />
                </div>

                <button
                  type="button"
                  disabled={loading || otpCode.length !== 6}
                  onClick={handleVerifyOtp}
                  className="w-full py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition duration-200 transform active:scale-[0.98] cursor-pointer flex items-center justify-center"
                >
                  {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : "Verify & Create Account"}
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={resetPhoneFlow}
                  className="w-full text-xs text-slate-500 hover:text-slate-400 transition py-1"
                >
                  ← Change number or resend
                </button>
              </>
            )}
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-white/5 text-center text-xs text-slate-400 flex flex-col space-y-2.5">
          <span>
            Already have an account?{" "}
            <Link href="/sign-in" className="text-purple-400 hover:text-purple-300 font-semibold transition">
              Sign In
            </Link>
          </span>
          <Link href="/" className="text-slate-500 hover:text-slate-400 transition flex items-center justify-center space-x-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to landing page</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
