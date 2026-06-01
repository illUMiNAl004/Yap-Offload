"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Check, Trash2, LayoutGrid, ArrowRight } from "lucide-react";
import { useDB, toggleTodo, remove, updateTodo, urgency, type StoredTodo } from "@/lib/store";
import PageShell from "@/components/PageShell";
import { QuickAddTask } from "@/components/AddForms";

function OrganizeBanner() {
  return (
    <Link
      href="/organize"
      className="card card-hover flex items-center justify-between gap-4 p-4"
    >
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent">
          <LayoutGrid size={18} />
        </span>
        <span>
          <span className="block font-medium text-ink">Organize &amp; focus</span>
          <span className="block text-sm text-muted">Lanes, priority matrix, and a focus timer</span>
        </span>
      </span>
      <ArrowRight size={18} className="text-muted" />
    </Link>
  );
}

const prioColor: Record<StoredTodo["priority"], string> = {
  low: "var(--color-muted)",
  normal: "var(--color-task)",
  high: "var(--color-accent)",
};
const PRIO_CYCLE: StoredTodo["priority"][] = ["low", "normal", "high"];

function toLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Row({ t, i }: { t: StoredTodo; i: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-surface-2"
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
        <button
          onClick={() =>
            updateTodo(t.id, {
              priority: PRIO_CYCLE[(PRIO_CYCLE.indexOf(t.priority) + 1) % 3],
            })
          }
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: prioColor[t.priority] }}
          title={`Priority: ${t.priority} — click to change`}
        />
      )}

      <input
        key={t.title}
        defaultValue={t.title}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== t.title) updateTodo(t.id, { title: v });
        }}
        className={`flex-1 bg-transparent outline-none ${t.done ? "text-muted line-through" : "text-ink"}`}
      />

      <input
        type="datetime-local"
        value={toLocal(t.due)}
        onChange={(e) => updateTodo(t.id, { due: e.target.value || null })}
        className="rounded-lg border border-line bg-transparent px-2 py-1 text-xs text-task outline-none"
      />

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
      addSlot={
        <div className="space-y-3">
          <OrganizeBanner />
          <QuickAddTask />
        </div>
      }
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
