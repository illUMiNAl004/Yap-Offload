import { NextRequest, NextResponse } from "next/server";
import { sort } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { text, timeZone, now } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Nothing to sort." }, { status: 400 });
    }
    const tz = typeof timeZone === "string" && timeZone ? timeZone : "UTC";
    // prefer the user's device-local now (so "tomorrow" resolves to their day)
    const nowISO = typeof now === "string" && now ? now : new Date().toISOString();
    const { result, mock } = await sort(text, nowISO, tz);
    return NextResponse.json({ result, mock });
  } catch (err) {
    console.error("sort error", err);
    return NextResponse.json(
      { error: "Could not sort that. Try again?" },
      { status: 500 },
    );
  }
}
