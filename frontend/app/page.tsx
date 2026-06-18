"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFinOps } from "./context/FinOpsContext";

export default function Login() {
  const { login, signup, loginWithGoogle, loginWithFacebook, isAuthenticated } = useFinOps();
  const router = useRouter();
  
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<"idle" | "loading" | "success">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    setErrorMsg("");
    setLoadingStatus("loading");

    try {
      if (mode === "signin") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      setLoadingStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err: any) {
      setLoadingStatus("idle");
      // Use console.warn for expected auth validation errors to avoid Next.js dev tools overlay
      if (err.code && err.code.startsWith("auth/")) {
        console.warn("Auth validation error:", err.message || err.code);
      } else {
        console.error("Unexpected authentication error:", err);
      }
      
      // Provide clean human readable messages for standard Firebase Auth codes
      let msg = err.message || "Authentication failed. Please check your credentials.";
      if (err.code === "auth/invalid-credential") {
        msg = "Invalid email or password. Please try again.";
      } else if (err.code === "auth/email-already-in-use") {
        msg = "An account with this email already exists.";
      } else if (err.code === "auth/weak-password") {
        msg = "Password should be at least 6 characters.";
      } else if (err.code === "auth/invalid-email") {
        msg = "Invalid email address format.";
      }
      setErrorMsg(msg);
    }
  };
 
  const handleGoogleLogin = async () => {
    setErrorMsg("");
    setLoadingStatus("loading");
    try {
      await loginWithGoogle();
      setLoadingStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err: any) {
      setLoadingStatus("idle");
      console.warn("Google Sign-In failed:", err.message || err);
      setErrorMsg(err.message || "Google Sign-In failed.");
    }
  };
 
  const handleFacebookLogin = async () => {
    setErrorMsg("");
    setLoadingStatus("loading");
    try {
      await loginWithFacebook();
      setLoadingStatus("success");
      setTimeout(() => {
        router.push("/dashboard");
      }, 800);
    } catch (err: any) {
      setLoadingStatus("idle");
      console.warn("Facebook Sign-In failed:", err.message || err);
      setErrorMsg(err.message || "Facebook Sign-In failed.");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#070b13] text-[#dae2fd] overflow-x-hidden font-sans select-none flex flex-col justify-between">
      {/* Ambient Background Glows */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full bg-[radial-gradient(circle,rgba(77,142,255,0.05)_0%,rgba(7,11,19,0)_70%)] filter blur-[80px] pointer-events-none -translate-x-[30%] -translate-y-[30%] z-0" />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none z-0 bg-[radial-gradient(#8c909f_0.5px,transparent_0.5px)] bg-[size:32px_32px]" />

      <main className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] min-h-screen relative z-10 w-full">
        {/* Left Side: Brand Area */}
        <section className="hidden lg:flex flex-col justify-between p-16 bg-[#03060a]/40 border-r border-[#334155]/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4.5 mb-16">
              <div className="w-10 h-10 bg-[#adc6ff] rounded-lg flex items-center justify-center shadow-lg shadow-[#adc6ff]/10">
                <span className="material-symbols-outlined text-[#002e6a] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  cloud_done
                </span>
              </div>
              <span className="font-semibold text-2xl text-white tracking-tight">CloudOptix</span>
            </div>
            
            <div className="mt-20">
              <h1 className="text-[84px] leading-[0.98] font-bold text-white tracking-tighter mb-8">
                Intelligence<br />
                <span className="text-[#adc6ff]">Optimized.</span>
              </h1>
              <p className="text-base text-slate-400 max-w-md leading-relaxed">
                The definitive operating system for enterprise resource intelligence and secure cloud orchestration.
              </p>
            </div>
          </div>

          {/* Watermark Logo */}
          <div className="absolute -bottom-20 -left-20 opacity-[0.02] select-none pointer-events-none">
            <span className="material-symbols-outlined text-[600px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              cloud_done
            </span>
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0b1326]/60 border border-[#8c909f]/10 rounded-full">
              <span className="material-symbols-outlined text-primary text-[15px]">verified_user</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-wider">Encrypted Session</span>
            </div>
            <p className="text-xs text-outline/30 font-mono">v4.2.0-STABLE</p>
          </div>
        </section>

        {/* Right Side: Form */}
        <section className="flex items-center justify-center p-6 md:p-16 bg-[#090d16]">
          <div className="w-full max-w-[380px] flex flex-col justify-between h-full py-8 lg:py-0">
            {/* Mobile Header (Visible only on small screens) */}
            <div className="lg:hidden text-center mb-12">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-[#adc6ff] rounded-xl mb-4 shadow-lg shadow-[#adc6ff]/10">
                <span className="material-symbols-outlined text-[#002e6a] text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  cloud_done
                </span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-1">CloudOptix</h1>
              <p className="text-sm text-slate-400">Enterprise Resource Intelligence</p>
            </div>

            <div className="space-y-8 my-auto">
              <div className="space-y-1">
                <h2 className="text-[22px] font-medium text-white">
                  {mode === "signin" ? "Welcome back" : "Create your account"}
                </h2>
                <p className="text-sm text-slate-400">
                  {mode === "signin" ? "Sign in to your work account" : "Get started with CloudOptix"}
                </p>
              </div>

              {/* Toggle Tabs */}
              <div className="flex bg-[#0b1326]/60 border border-[#8c909f]/10 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setErrorMsg(""); }}
                  className={`flex-1 text-center py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 ${
                    mode === "signin"
                      ? "bg-[#adc6ff] text-[#002e6a] shadow-lg shadow-[#adc6ff]/10 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setErrorMsg(""); }}
                  className={`flex-1 text-center py-2.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-300 ${
                    mode === "signup"
                      ? "bg-[#adc6ff] text-[#002e6a] shadow-lg shadow-[#adc6ff]/10 font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  CREATE ACCOUNT
                </button>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 block" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                      mail
                    </span>
                    <input
                      className="w-full bg-white border border-slate-200 pl-11 pr-4 py-3.5 rounded-lg text-slate-900 text-sm placeholder:text-slate-400/80 focus:border-[#adc6ff] focus:ring-2 focus:ring-[#adc6ff]/20 focus:outline-none transition-all duration-200 shadow-sm"
                      id="email"
                      name="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-slate-400 block" htmlFor="password">
                      Password
                    </label>
                    {mode === "signin" && (
                      <a className="text-xs text-[#adc6ff] hover:text-[#adc6ff]/80 transition-all" href="#">
                        Forgot Password?
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                      lock
                    </span>
                    <input
                      className="w-full bg-white border border-slate-200 pl-11 pr-12 py-3.5 rounded-lg text-slate-900 text-sm placeholder:text-slate-400/80 focus:border-[#adc6ff] focus:ring-2 focus:ring-[#adc6ff]/20 focus:outline-none transition-all duration-200 shadow-sm"
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Sign In / Sign Up Button */}
                <button
                  className={`w-full font-medium py-3.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg ${
                    loadingStatus === "success"
                      ? "bg-emerald-600 hover:bg-emerald-600 text-white shadow-emerald-600/10"
                      : "bg-[#adc6ff] hover:brightness-105 text-[#002e6a] shadow-[#adc6ff]/10 active:scale-[0.98]"
                  }`}
                  type="submit"
                  disabled={loadingStatus !== "idle"}
                >
                  {loadingStatus === "idle" && (
                    <>
                      <span>{mode === "signin" ? "Sign In" : "Create Account"}</span>
                      <span className="material-symbols-outlined text-[18px]">
                        {mode === "signin" ? "login" : "person_add"}
                      </span>
                    </>
                  )}
                  {loadingStatus === "loading" && (
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-[#002e6a]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{mode === "signin" ? "Authenticating..." : "Creating Account..."}</span>
                    </div>
                  )}
                  {loadingStatus === "success" && (
                    <>
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      <span>Success</span>
                    </>
                  )}
                </button>
              </form>

              {/* Toggle Footer Hint */}
              <div className="text-center text-xs text-slate-400 mt-4">
                {mode === "signin" ? (
                  <p>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("signup"); setErrorMsg(""); }}
                      className="text-[#adc6ff] hover:underline font-semibold"
                    >
                      Create Account
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => { setMode("signin"); setErrorMsg(""); }}
                      className="text-[#adc6ff] hover:underline font-semibold"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#8c909f]/10"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#090d16] px-4 text-slate-500 uppercase tracking-widest text-[9px]">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loadingStatus !== "idle"}
                  className="flex items-center justify-center gap-2 border border-[#8c909f]/20 bg-[#090d16] hover:bg-[#1e293b]/20 hover:border-[#adc6ff]/40 text-white font-medium py-3 rounded-lg transition-all duration-200 text-xs active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current text-[#dae2fd]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.88 5.88 0 018 12.63a5.88 5.88 0 015.99-5.886c1.613 0 3.076.611 4.195 1.621l3.079-3.078c-1.954-1.822-4.52-2.93-7.274-2.93C8.125 2.357 4 6.482 4 11.572S8.125 20.787 13.99 20.787c5.772 0 10.01-4.056 10.01-10.182 0-.6-.054-1.072-.119-1.52H12.24z"/>
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleFacebookLogin}
                  disabled={loadingStatus !== "idle"}
                  className="flex items-center justify-center gap-2 border border-[#8c909f]/20 bg-[#090d16] hover:bg-[#1e293b]/20 hover:border-[#adc6ff]/40 text-white font-medium py-3 rounded-lg transition-all duration-200 text-xs active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="w-4 h-4 fill-current text-[#dae2fd]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <footer className="mt-12 pt-6 border-t border-[#8c909f]/10 w-full text-center lg:text-left text-xs">
              <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center lg:justify-start mb-2 text-slate-400">
                <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
                <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
                <a className="hover:text-primary transition-colors" href="#">Support</a>
              </div>
              <p className="text-[11px] text-slate-600">© 2026 CloudOptix Inc. All rights reserved.</p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
