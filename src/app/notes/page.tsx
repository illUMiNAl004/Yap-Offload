"use client";

import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import { useDB, remove } from "@/lib/store";
import { fmtDate } from "@/lib/format";
import PageShell from "@/components/PageShell";
import { NoteComposer } from "@/components/AddForms";

export default function NotesPage() {
  const db = useDB();

  return (
    <PageShell
      title="Notes"
      accent="var(--color-note)"
      subtitle="Things you learned and wanted to keep."
      count={db.notes.length}
      empty="No notes yet. Add one below, or mention something you learned out loud."
      addSlot={<NoteComposer />}
    >
      <div className="gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
        {db.notes.map((n, i) => (
          <motion.article
            key={n.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card card-hover group p-6"
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="font-serif text-xl text-ink">{n.title}</h3>
              <button
                onClick={() => remove("notes", n.id)}
                className="mt-1 opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 size={15} className="text-muted hover:text-accent" />
              </button>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed text-ink-soft">{n.body}</p>
            <p className="mt-4 text-xs uppercase tracking-wide text-note">{fmtDate(n.createdAt)}</p>
          </motion.article>
        ))}
      </div>
    </PageShell>
  );
}
