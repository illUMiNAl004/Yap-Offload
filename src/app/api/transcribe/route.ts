import { NextRequest, NextResponse } from "next/server";
import { transcribe } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "No audio file provided." }, { status: 400 });
    }
    const { text, mock } = await transcribe(audio);
    return NextResponse.json({ text, mock });
  } catch (err) {
    console.error("transcribe error", err);
    // surface the real reason (e.g. unsupported format, file too large, bad key)
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Couldn't transcribe: ${detail}`.slice(0, 300) },
      { status: 500 },
    );
  }
}
