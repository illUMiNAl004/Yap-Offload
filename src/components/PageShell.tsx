"use client";

import { motion } from "motion/react";
import { Mic } from "lucide-react";
import { useRecord } from "@/components/RecordProvider";

export default function PageShell({
  title,
  accent,
  subtitle,
  count,
  empty,
  addSlot,
  children,
}: {
  title: string;
  accent: string;
  subtitle: string;
  count: number;
  empty?: React.ReactNode;
  addSlot?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open } = useRecord();
  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-24 pt-8 sm:px-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mb-9 flex items-end justify-between gap-4"
      >
        <div className="flex items-end gap-3">
          <span className="mb-3 h-3 w-3 shrink-0 rounded-full" style={{ background: accent }} />
          <div>
            <h1 className="font-serif text-5xl tracking-tight text-ink sm:text-6xl">
              {title}
              <span className="text-accent">.</span>
            </h1>
            <p className="mt-1.5 text-lg text-muted">{subtitle}</p>
          </div>
        </div>
        {count > 0 && (
          <span className="font-serif text-6xl leading-none text-accent/80 sm:text-7xl" aria-hidden>
            {count}
          </span>
        )}
      </motion.div>

      {addSlot && <div className="mb-5">{addSlot}</div>}

      {count === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="card flex flex-col items-center gap-4 px-6 py-20 text-center"
        >
          <p className="max-w-sm text-ink-soft">{empty}</p>
          <button
            onClick={open}
            className="flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-white transition hover:brightness-105"
          >
            <Mic size={16} /> Talk it out
          </button>
        </motion.div>
      ) : (
        children
      )}
    </main>
  );
}
