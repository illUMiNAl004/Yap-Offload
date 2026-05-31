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
    return NextResponse.json(
      { error: "Could not transcribe that. Try again?" },
      { status: 500 },
    );
  }
}
