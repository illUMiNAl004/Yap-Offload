"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useAuth } from "@/lib/auth";

export default function SignIn() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        const { needsConfirm } = await signUpWithEmail(email.trim(), password);
        if (needsConfirm) {
          setMsg("Check your email to confirm, then sign in.");
          setMode("signin");
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <p className="font-serif text-2xl tracking-tight text-ink">
          yap<span className="text-spectrum italic">load</span>
        </p>
        <h1 className="mt-7 font-serif text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Talk your day out<span className="text-accent">.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-lg text-muted">
          Sign in to keep your memories synced and safe.
        </p>

        <form onSubmit={submit} className="mt-9 space-y-3 text-left">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="card w-full px-4 py-3 text-ink outline-none placeholder:text-muted"
          />
          <input
            type="password"
            required
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="card w-full px-4 py-3 text-ink outline-none placeholder:text-muted"
          />
          {err && <p className="text-sm text-accent">{err}</p>}
          {msg && <p className="text-sm text-task">{msg}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-accent py-3.5 text-lg text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-sm text-muted">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr("");
              setMsg("");
            }}
            className="text-accent underline-offset-4 hover:underline"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>

        <button
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-3 rounded-full border border-line bg-surface px-6 py-3 text-ink transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]"
        >
          <GoogleMark /> Continue with Google
        </button>
      </motion.div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
