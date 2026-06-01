"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useAuth, displayName } from "@/lib/auth";

export default function Onboarding() {
  const { user, setName } = useAuth();
  const [value, setValue] = useState(displayName(user)); // prefill with Google name if any
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    try {
      await setName(value);
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
        <h1 className="mt-8 font-serif text-5xl leading-[1.1] tracking-tight text-ink sm:text-6xl">
          What should I call you<span className="text-accent">?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-lg text-muted">
          So your days feel like yours.
        </p>

        <form onSubmit={submit} className="mt-9">
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your name"
            className="card w-full px-5 py-4 text-center font-serif text-2xl text-ink outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={busy || !value.trim()}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-lg text-white transition hover:brightness-105 disabled:opacity-50"
          >
            {busy ? "…" : "That's me"}
            {!busy && <ArrowRight size={18} />}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
