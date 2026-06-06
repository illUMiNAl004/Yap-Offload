import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!token || !url || !anon || !clientId || !clientSecret)
    return NextResponse.json({ connected: false, events: [] }, { status: 200 });

  const supa = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ events: [] }, { status: 401 });

  const { data: conn } = await supa
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn?.refresh_token) return NextResponse.json({ connected: false, events: [] }, { status: 200 });

  // fresh access token
  const tr = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: conn.refresh_token, grant_type: "refresh_token" }),
  });
  const tj = await tr.json();
  const accessToken = tj.access_token as string | undefined;
  if (!accessToken) return NextResponse.json({ connected: true, events: [] }, { status: 200 });

  const { start, end } = await req.json();
  const params = new URLSearchParams({
    timeMin: new Date(start).toISOString(),
    timeMax: new Date(end).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  });
  const er = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const ej = await er.json();
  type GEvent = {
    id: string;
    summary?: string;
    location?: string;
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
  };
  const events = (ej.items ?? []).map((e: GEvent) => ({
    id: e.id,
    title: e.summary || "(busy)",
    start: e.start?.dateTime || e.start?.date,
    end: e.end?.dateTime || e.end?.date || null,
    allDay: !e.start?.dateTime,
    location: e.location ?? null,
  }));

  return NextResponse.json({ connected: true, events });
}
