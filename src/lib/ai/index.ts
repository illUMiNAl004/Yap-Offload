import Groq from "groq-sdk";
import { SortResult, SortResultSchema } from "@/lib/types";
import { buildSortSystemPrompt } from "./prompt";
import { MOCK_TRANSCRIPT, mockSort } from "./mock";

/**
 * The AI layer, provider-abstracted. Today it's Groq (free, fast).
 * To swap in Claude/OpenAI later, only this file changes.
 */

const TRANSCRIBE_MODEL = "whisper-large-v3-turbo";
const SORT_MODEL = "llama-3.3-70b-versatile";

let _client: Groq | null = null;
function client(): Groq | null {
  if (!process.env.GROQ_API_KEY) return null;
  if (!_client) _client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return _client;
}

export const aiConfigured = () => Boolean(process.env.GROQ_API_KEY);

/** Speech → text. Falls back to a demo transcript when no key is set. */
export async function transcribe(audio: File): Promise<{ text: string; mock: boolean }> {
  const groq = client();
  if (!groq) return { text: MOCK_TRANSCRIPT, mock: true };

  const res = await groq.audio.transcriptions.create({
    file: audio,
    model: TRANSCRIBE_MODEL,
    language: "en",
    // a touch of context nudges Whisper toward names/dates
    prompt: "A spoken brain-dump about my day: tasks, plans, appointments, and reflections.",
  });
  return { text: res.text.trim(), mock: false };
}

/** Raw transcript → organized buckets. Falls back to a heuristic demo sort. */
export async function sort(
  text: string,
  nowISO: string,
  timeZone: string,
): Promise<{ result: SortResult; mock: boolean }> {
  const groq = client();
  if (!groq) return { result: mockSort(text), mock: true };

  const completion = await groq.chat.completions.create({
    model: SORT_MODEL,
    temperature: 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildSortSystemPrompt(nowISO, timeZone) },
      { role: "user", content: text },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = {};
  }
  // Validate + coerce defaults; tolerate the model dropping optional fields.
  const result = SortResultSchema.parse(parsed ?? {});
  return { result, mock: false };
}
