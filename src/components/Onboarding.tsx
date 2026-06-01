"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, CalendarCheck } from "lucide-react";
import { useAuth, displayName } from "@/lib/auth";

export default function Onboarding() {
  const { user, setName, connectGoogle } = useAuth();
  const [step, setStep] = useState<"name" | "connect">("name");
  const [value, setValue] = useState(displayName(user));
  const [busy, setBusy] = useState(false);

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setStep("connect");
  }

  async function connect() {
    // stash the name so it's applied when we return from Google's redirect
    try {
      localStorage.setItem("yapload.pendingName", value.trim());
    } catch {}
    await connectGoogle();
  }

  async function later() {
    setBusy(true);
    try {
      await setName(value); // finishes onboarding → lands in the app
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="absolute top-6 font-serif text-2xl tracking-tight text-ink">
        yap<span className="text-spectrum italic">load</span>
      </p>

      <AnimatePresence mode="wait">
        {step === "name" ? (
          <motion.div
            key="name"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md"
          >
            <h1 className="font-serif text-5xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
              What should I call you<span className="text-accent">?</span>
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-lg text-muted">So your days feel like yours.</p>
            <form onSubmit={next} className="mt-9">
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Your name"
                className="card w-full px-5 py-4 text-center font-serif text-2xl text-ink outline-none placeholder:text-muted"
              />
              <button
                type="submit"
                disabled={!value.trim()}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-lg text-white transition hover:brightness-105 disabled:opacity-50"
              >
                Continue <ArrowRight size={18} />
              </button>
            </form>
          </motion.div>
        ) : (
          <motion.div
            key="connect"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-md"
          >
            <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full bg-surface-2">
              <CalendarCheck size={28} className="text-accent" />
            </div>
            <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Nice to meet you, <span className="text-accent">{value.trim()}</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-sm text-lg text-muted">
              Want events you mention to land on your <strong className="text-ink-soft">Google Calendar</strong>,
              and todos in <strong className="text-ink-soft">Google Tasks</strong> — automatically? Connect now, or skip and do it later in Settings.
            </p>
            <div className="mt-9 flex flex-col items-center gap-3">
              <button
                onClick={connect}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-lg text-white transition hover:brightness-105"
              >
                Connect Google Calendar &amp; Tasks
              </button>
              <button
                onClick={later}
                disabled={busy}
                className="text-muted underline-offset-4 transition hover:text-ink hover:underline disabled:opacity-50"
              >
                {busy ? "…" : "Maybe later"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
