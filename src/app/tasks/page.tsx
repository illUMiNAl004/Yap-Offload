"use client";

import { motion } from "motion/react";
import { Check, Trash2 } from "lucide-react";
import { useDB, toggleTodo, remove, urgency, type StoredTodo } from "@/lib/store";
import { fmtDay } from "@/lib/format";
import PageShell from "@/components/PageShell";
import { QuickAddTask } from "@/components/AddForms";

const prioColor: Record<StoredTodo["priority"], string> = {
  low: "var(--color-muted)",
  normal: "var(--color-task)",
  high: "var(--color-accent)",
};

function Row({ t, i }: { t: StoredTodo; i: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="group flex items-center gap-3.5 rounded-xl px-4 py-3.5 transition hover:bg-surface-2"
    >
      <button
        onClick={() => toggleTodo(t.id)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition"
        style={{
          borderColor: t.done ? "var(--color-task)" : "var(--color-line-strong)",
          background: t.done ? "var(--color-task)" : "transparent",
        }}
        aria-label={t.done ? "Mark not done" : "Mark done"}
      >
        {t.done && <Check size={14} className="text-white" strokeWidth={3} />}
      </button>

      {!t.done && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: prioColor[t.priority] }}
          title={`${t.priority} priority`}
        />
      )}

      <span className={`flex-1 ${t.done ? "text-muted line-through" : "text-ink"}`}>{t.title}</span>

      {t.due && (
        <span className="rounded-lg border border-task/25 bg-task/10 px-2 py-1 text-xs text-task">
          {fmtDay(t.due)}
        </span>
      )}

      <button
        onClick={() => remove("todos", t.id)}
        className="opacity-0 transition group-hover:opacity-100"
      >
        <Trash2 size={15} className="text-muted hover:text-accent" />
      </button>
    </motion.li>
  );
}

export default function TasksPage() {
  const db = useDB();
  const active = db.todos.filter((t) => !t.done).sort((a, b) => urgency(b) - urgency(a));
  const done = db.todos.filter((t) => t.done);

  return (
    <PageShell
      title="Tasks"
      accent="var(--color-task)"
      subtitle="Everything you said you needed to do."
      count={db.todos.length}
      empty="Nothing on your plate. Add one below, or talk through your day."
      addSlot={<QuickAddTask />}
    >
      <div className="card p-3 sm:p-4">
        <ul className="divide-y divide-line">
          {active.map((t, i) => (
            <Row key={t.id} t={t} i={i} />
          ))}
        </ul>

        {done.length > 0 && (
          <div className="mt-4 border-t border-line pt-2">
            <p className="px-4 py-2 text-sm text-muted">Done · {done.length}</p>
            <ul className="divide-y divide-line opacity-60">
              {done.map((t, i) => (
                <Row key={t.id} t={t} i={i} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </PageShell>
  );
}
