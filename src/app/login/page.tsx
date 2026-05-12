"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.endsWith("@accenture.com")) {
      setError("Access is restricted to @accenture.com email addresses.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setStep("code");
    }
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (authError) {
      setError("Invalid or expired code. Try again.");
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <span className="text-3xl font-bold" style={{ color: "#A100FF" }}>&gt;</span>
          <span className="text-white font-semibold text-lg">ERD Visualizer</span>
        </div>

        {step === "email" ? (
          <form onSubmit={handleEmailSubmit} className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
            <h1 className="text-white font-semibold text-xl mb-1">Sign in</h1>
            <p className="text-white/40 text-sm mb-6">
              Accenture employees only. We&apos;ll email you a 6-digit code.
            </p>

            <label className="block text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@accenture.com"
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-white/30 mb-4"
            />

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#A100FF" }}
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
            <h1 className="text-white font-semibold text-xl mb-1">Enter your code</h1>
            <p className="text-white/40 text-sm mb-6">
              We sent a 6-digit code to <span className="text-white">{email}</span>.
            </p>

            <label className="block text-white/60 text-xs font-medium mb-2 uppercase tracking-wide">
              Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              required
              maxLength={6}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 text-sm focus:outline-none focus:border-white/30 mb-4 tracking-widest text-center text-lg"
            />

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#A100FF" }}
            >
              {loading ? "Verifying…" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(""); }}
              className="w-full mt-3 py-2 text-white/30 text-xs hover:text-white/50 transition-colors"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
