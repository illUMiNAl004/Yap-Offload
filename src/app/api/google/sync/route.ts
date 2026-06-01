import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!token || !url || !anon) return NextResponse.json({ connected: false }, { status: 200 });
  if (!clientId || !clientSecret)
    return NextResponse.json({ connected: false, error: "server-not-configured" }, { status: 200 });

  // identify the user + read their stored refresh token (RLS scopes to them)
  const supa = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
  } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: conn } = await supa
    .from("google_connections")
    .select("refresh_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!conn?.refresh_token) return NextResponse.json({ connected: false }, { status: 200 });

  // mint a fresh access token from the refresh token
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: conn.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token as string | undefined;
  if (!accessToken)
    return NextResponse.json({ connected: true, error: "refresh-failed" }, { status: 200 });

  const { events = [], todos = [] } = await req.json();
  const gh = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
  let calCount = 0;
  let taskCount = 0;

  for (const e of events) {
    try {
      let body: Record<string, unknown>;
      if (e.allDay) {
        const day = String(e.start).slice(0, 10);
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        body = {
          summary: e.title,
          location: e.location || undefined,
          start: { date: day },
          end: { date: next.toISOString().slice(0, 10) },
        };
      } else {
        const start = new Date(e.start);
        const end = e.end ? new Date(e.end) : new Date(start.getTime() + 3600000);
        body = {
          summary: e.title,
          location: e.location || undefined,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() },
        };
      }
      const r = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
        method: "POST",
        headers: gh,
        body: JSON.stringify(body),
      });
      if (r.ok) calCount++;
    } catch {
      /* skip this event */
    }
  }

  for (const t of todos) {
    try {
      const body: Record<string, unknown> = { title: t.title };
      if (t.due) body.due = new Date(t.due).toISOString();
      const r = await fetch("https://tasks.googleapis.com/tasks/v1/lists/@default/tasks", {
        method: "POST",
        headers: gh,
        body: JSON.stringify(body),
      });
      if (r.ok) taskCount++;
    } catch {
      /* skip this task */
    }
  }

  return NextResponse.json({ connected: true, events: calCount, tasks: taskCount });
}
