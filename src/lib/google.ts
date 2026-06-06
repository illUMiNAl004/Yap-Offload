"use client";

import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { CalEvent, Todo } from "@/lib/types";

/**
 * Robust Google sync: we capture the long-lived refresh token after the user
 * connects Google, store it (RLS-protected), and a server route mints fresh
 * access tokens to insert Calendar events + Google Tasks — so it keeps working
 * without re-login.
 */

/** Save the Google refresh token if this session just came back from OAuth. */
export async function captureGoogleRefreshToken(session: Session | null) {
  const rt = session?.provider_refresh_token;
  if (!rt || !supabase) return;
  await supabase.from("google_connections").upsert(
    { refresh_token: rt, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
}

export async function isGoogleConnected(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.from("google_connections").select("user_id").maybeSingle();
  return !!data;
}

export async function disconnectGoogle() {
  if (!supabase) return;
  const { data: u } = await supabase.auth.getUser();
  if (u.user) await supabase.from("google_connections").delete().eq("user_id", u.user.id);
}

export type GoogleEvent = {
  id: string;
  title: string;
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
};

/** Pull the user's real Google Calendar events for a date range (read-only). */
export async function fetchGoogleEvents(startISO: string, endISO: string): Promise<GoogleEvent[]> {
  if (!supabase) return [];
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return [];
  try {
    const res = await fetch("/api/google/events", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ start: startISO, end: endISO }),
    });
    const j = await res.json();
    return (j.events ?? []).filter((e: GoogleEvent) => e.start);
  } catch {
    return [];
  }
}

type SyncResult = { connected: boolean; events?: number; tasks?: number; error?: string };

/** Push events → Google Calendar and todos → Google Tasks (best effort). */
export async function syncToGoogle(payload: {
  events: CalEvent[];
  todos: Todo[];
}): Promise<SyncResult> {
  if (!supabase) return { connected: false };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { connected: false };
  try {
    const res = await fetch("/api/google/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch {
    return { connected: false, error: "network" };
  }
}
