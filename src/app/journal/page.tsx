"use client";

import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { useDB } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import PageShell from "@/components/PageShell";

export default function JournalPage() {
  const db = useDB();

  return (
    <PageShell
      title="Journal"
      accent="var(--color-journal)"
      subtitle="The days you talked through, written back to you."
      count={db.journal.length}
      empty="No entries yet. Talk about your day and your reflections land here."
    >
      <div className="space-y-5">
        {db.journal.map((e, i) => (
          <motion.article
            key={e.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.5 }}
            className="card card-hover p-7 sm:p-9"
          >
            <p className="mb-3 text-sm font-medium uppercase tracking-wide text-journal">
              {fmtDate(e.createdAt)}
            </p>
            <p className="whitespace-pre-wrap font-serif text-2xl leading-relaxed text-ink-soft">
              {e.body}
            </p>
            {e.highlights.length > 0 && (
              <div className="mt-6 border-t border-line pt-5">
                <p className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-accent">
                  <Sparkles size={14} /> Worth remembering
                </p>
                <ul className="space-y-1.5">
                  {e.highlights.map((h, j) => (
                    <li key={j} className="flex items-start gap-2 text-ink-soft">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.article>
        ))}
      </div>
    </PageShell>
  );
}
