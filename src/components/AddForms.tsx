"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { addTodo, addNote, addEvent } from "@/lib/store";

/** Quick-add a task by typing — Enter to add. */
export function QuickAddTask() {
  const [v, setV] = useState("");
  const submit = () => {
    if (!v.trim()) return;
    addTodo(v);
    setV("");
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 border-line-strong text-muted">
        <Plus size={13} />
      </span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Add a task…"
        className="flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
      />
      {v.trim() && (
        <button
          onClick={submit}
          className="rounded-full bg-accent px-4 py-1.5 text-sm text-white transition hover:brightness-105"
        >
          Add
        </button>
      )}
    </div>
  );
}

/** Collapsed "+ New note" that expands into a title + body composer. */
export function NoteComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const save = () => {
    addNote(title, body);
    setTitle("");
    setBody("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card card-hover flex w-full items-center gap-2 p-4 text-left text-muted transition hover:text-ink"
      >
        <Plus size={17} className="text-accent" /> New note
      </button>
    );
  }
  return (
    <div className="card p-5">
      <div className="mb-2 flex items-center justify-between">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="flex-1 bg-transparent font-serif text-xl text-ink outline-none placeholder:text-muted"
        />
        <button onClick={() => setOpen(false)}>
          <X size={16} className="text-muted hover:text-accent" />
        </button>
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="Write it down…"
        className="w-full resize-none bg-transparent leading-relaxed text-ink-soft outline-none placeholder:text-muted"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={save}
          className="rounded-full bg-accent px-5 py-2 text-sm text-white transition hover:brightness-105"
        >
          Save note
        </button>
      </div>
    </div>
  );
}

/** Collapsed "+ Add event" that expands into title + datetime. */
export function EventComposer() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");

  const save = () => {
    if (!title.trim() || !when) return;
    const d = new Date(when);
    if (isNaN(d.getTime())) return;
    addEvent(title, d.toISOString());
    setTitle("");
    setWhen("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="card card-hover flex w-full items-center gap-2 p-4 text-left text-muted transition hover:text-ink"
      >
        <Plus size={17} className="text-accent" /> Add event
      </button>
    );
  }
  return (
    <div className="card flex flex-wrap items-center gap-3 p-5">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event name"
        className="min-w-40 flex-1 bg-transparent text-lg text-ink outline-none placeholder:text-muted"
      />
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 text-sm text-ink outline-none"
      />
      <button
        onClick={save}
        className="rounded-full bg-accent px-5 py-2 text-sm text-white transition hover:brightness-105"
      >
        Add
      </button>
      <button onClick={() => setOpen(false)} className="text-muted hover:text-accent">
        <X size={18} />
      </button>
    </div>
  );
}
