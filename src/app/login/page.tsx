"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.endsWith("@accenture.com")) {
      setError("Access is restricted to @accenture.com email addresses.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <span className="text-3xl font-bold" style={{ color: "#A100FF" }}>&gt;</span>
          <span className="text-white font-semibold text-lg">ERD Visualizer</span>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-white font-medium mb-2">Check your email</p>
            <p className="text-white/50 text-sm">
              We sent a login link to <span className="text-white">{email}</span>.
              Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
            <h1 className="text-white font-semibold text-xl mb-1">Sign in</h1>
            <p className="text-white/40 text-sm mb-6">
              Accenture employees only. We&apos;ll email you a sign-in link.
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

            {error && (
              <p className="text-red-400 text-sm mb-4">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#A100FF" }}
            >
              {loading ? "Sending…" : "Send login link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
