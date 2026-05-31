"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { SortResult, Todo, CalEvent, Note } from "./types";

/**
 * Cloud store, backed by Supabase (row-level-security scoped to the signed-in
 * user). The public API matches the old local store, so pages didn't change:
 * mutations fire-and-forget, then broadcast a change so useDB refetches.
 */

export type JournalEntry = {
  id: string;
  createdAt: string;
  body: string;
  highlights: string[];
  transcript: string;
};
export type StoredTodo = Todo & { id: string; createdAt: string; done: boolean };
export type StoredEvent = CalEvent & { id: string; createdAt: string };
export type StoredNote = Note & { id: string; createdAt: string };

export type DB = {
  journal: JournalEntry[];
  todos: StoredTodo[];
  events: StoredEvent[];
  notes: StoredNote[];
  photos: Record<string, string>; // dayKey -> public URL
};

const EVT = "yoffload:change";
const BUCKET = "day-photos";
const empty = (): DB => ({ journal: [], todos: [], events: [], notes: [], photos: {} });

function broadcast() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVT));
}

export function dayKey(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// ── reads ──────────────────────────────────────────────────
async function fetchAll(): Promise<DB> {
  if (!supabase) return empty();
  const [j, t, e, n, p] = await Promise.all([
    supabase.from("journal").select("*").order("created_at", { ascending: false }),
    supabase.from("todos").select("*").order("created_at", { ascending: false }),
    supabase.from("events").select("*").order("starts_at", { ascending: true }),
    supabase.from("notes").select("*").order("created_at", { ascending: false }),
    supabase.from("day_photos").select("*"),
  ]);

  const photos: Record<string, string> = {};
  for (const row of p.data ?? []) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(row.path);
    photos[row.day] = data.publicUrl;
  }

  return {
    journal: (j.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      body: r.body ?? "",
      highlights: Array.isArray(r.highlights) ? r.highlights : [],
      transcript: r.transcript ?? "",
    })),
    todos: (t.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      title: r.title,
      due: r.due ?? null,
      priority: r.priority ?? "normal",
      done: !!r.done,
    })),
    events: (e.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      title: r.title,
      start: r.starts_at,
      end: r.ends_at ?? null,
      location: r.location ?? null,
      allDay: !!r.all_day,
    })),
    notes: (n.data ?? []).map((r) => ({
      id: r.id,
      createdAt: r.created_at,
      title: r.title ?? "",
      body: r.body ?? "",
    })),
    photos,
  };
}

// ── writes ─────────────────────────────────────────────────
export async function saveSortResult(r: SortResult, transcript: string, nowISO: string) {
  if (!supabase) return;
  const ops: PromiseLike<unknown>[] = [];
  if (r.journal.trim() || r.highlights.length) {
    ops.push(
      supabase.from("journal").insert({
        created_at: nowISO,
        day: dayKey(nowISO),
        body: r.journal,
        highlights: r.highlights,
        transcript,
      }),
    );
  }
  if (r.todos.length) {
    ops.push(
      supabase.from("todos").insert(
        r.todos.map((t) => ({
          created_at: nowISO,
          title: t.title,
          due: t.due,
          priority: t.priority,
          done: false,
        })),
      ),
    );
  }
  if (r.events.length) {
    ops.push(
      supabase.from("events").insert(
        r.events.map((e) => ({
          created_at: nowISO,
          title: e.title,
          starts_at: e.start,
          ends_at: e.end,
          location: e.location,
          all_day: e.allDay,
        })),
      ),
    );
  }
  if (r.notes.length) {
    ops.push(
      supabase.from("notes").insert(
        r.notes.map((n) => ({ created_at: nowISO, title: n.title, body: n.body })),
      ),
    );
  }
  await Promise.all(ops);
  broadcast();
}

export async function addTodo(title: string) {
  if (!supabase || !title.trim()) return;
  await supabase.from("todos").insert({ title: title.trim(), priority: "normal", done: false });
  broadcast();
}

export async function addNote(title: string, body: string) {
  if (!supabase || (!title.trim() && !body.trim())) return;
  await supabase.from("notes").insert({ title: title.trim() || "Untitled", body: body.trim() });
  broadcast();
}

export async function addEvent(title: string, startISO: string, allDay = false) {
  if (!supabase || !title.trim() || !startISO) return;
  await supabase.from("events").insert({ title: title.trim(), starts_at: startISO, all_day: allDay });
  broadcast();
}

export async function toggleTodo(id: string) {
  if (!supabase) return;
  const { data } = await supabase.from("todos").select("done").eq("id", id).single();
  await supabase.from("todos").update({ done: !data?.done }).eq("id", id);
  broadcast();
}

export async function remove(kind: "todos" | "events" | "notes" | "journal", id: string) {
  if (!supabase) return;
  await supabase.from(kind).delete().eq("id", id);
  broadcast();
}

/** Set or clear the cover photo for a day. Accepts a JPEG data URL (or null). */
export async function setPhoto(key: string, dataUrl: string | null) {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return;
  const path = `${uid}/${key}.jpg`;

  if (dataUrl) {
    const blob = await (await fetch(dataUrl)).blob();
    await supabase.storage.from(BUCKET).upload(path, blob, {
      upsert: true,
      contentType: "image/jpeg",
    });
    await supabase.from("day_photos").upsert({ day: key, path });
  } else {
    await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("day_photos").delete().eq("day", key);
  }
  broadcast();
}

// ── derived ────────────────────────────────────────────────
export function journalStreak(db: DB): number {
  if (!db.journal.length) return 0;
  const days = new Set(db.journal.map((j) => dayKey(j.createdAt)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── reactive hook ──────────────────────────────────────────
export function useDB(): DB {
  const [db, setDB] = useState<DB>(empty);
  const refresh = useCallback(() => {
    fetchAll().then(setDB).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVT, refresh);
    const sub = supabase?.auth.onAuthStateChange(() => refresh());
    return () => {
      window.removeEventListener(EVT, refresh);
      sub?.data.subscription.unsubscribe();
    };
  }, [refresh]);

  return db;
}
