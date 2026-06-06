"use client";

import { createContext, useContext, useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Upload, Keyboard, Sparkles } from "lucide-react";
import { useRecorder } from "@/lib/useRecorder";
import FlowField from "@/components/FlowField";
import RecordButton from "@/components/RecordButton";
import WavePill from "@/components/WavePill";
import Review from "@/components/Review";
import { saveSortResult, fillAutoSchedule } from "@/lib/store";
import { syncToGoogle } from "@/lib/google";
import type { SortResult } from "@/lib/types";

type Phase = "idle" | "typing" | "processing" | "review" | "kept";

/** The user's actual local date/time + IANA timezone, for correct "tomorrow" parsing. */
function clientNow(): { tz: string; now: string } {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const s = new Intl.DateTimeFormat("sv-SE", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date());
  return { tz, now: s.replace(" ", "T") };
}

/** Pick a file extension Groq/Whisper recognizes, from the blob's MIME type. */
function extFor(type: string): string {
  if (type.includes("webm")) return "webm";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac") || type.includes("x-m4a")) return "mp4";
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  if (type.includes("flac")) return "flac";
  return "webm";
}

const PROMPTS = ["How was your day?", "What's on your mind?", "Tell me everything.", "Let it all out."];

const RecordCtx = createContext<{ open: () => void }>({ open: () => {} });
export const useRecord = () => useContext(RecordCtx);

export default function RecordProvider({ children }: { children: React.ReactNode }) {
  const { state, seconds, start, stop, analyser } = useRecorder();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<SortResult | null>(null);
  const [mock, setMock] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [prompt, setPrompt] = useState(PROMPTS[0]);

  const recording = state === "recording";
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [typed, setTyped] = useState("");
  const lastKeyRef = useRef(0); // for the typing-reactive background

  const openRecorder = useCallback(() => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    setPhase("idle");
    setError("");
    setResult(null);
    setTranscript("");
    setTyped("");
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    if (recording) stop();
    setOpen(false);
  }, [recording, stop]);

  async function handleToggle() {
    setError("");
    if (recording) {
      const blob = await stop();
      if (!blob) {
        setError("I didn't catch any audio. Mic working?");
        return;
      }
      await process(blob, `recording.${extFor(blob.type)}`);
    } else {
      await start();
    }
  }

  async function handleUpload(file?: File) {
    if (!file) return;
    await process(file, file.name);
  }

  async function process(blob: Blob, filename = "dump.webm") {
    setPhase("processing");
    try {
      setStatus("Listening back…");
      const fd = new FormData();
      fd.append("audio", blob, filename);
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error || "Transcription failed");
      setTranscript(tJson.text);

      setStatus("Sorting your day…");
      const { tz, now } = clientNow();
      const sRes = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: tJson.text, timeZone: tz, now }),
      });
      const sJson = await sRes.json();
      if (!sRes.ok) throw new Error(sJson.error || "Sorting failed");
      setResult(await fillAutoSchedule(sJson.result));
      setMock(Boolean(tJson.mock || sJson.mock));
      setPhase("review");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }

  async function processText(text: string) {
    if (!text.trim()) return;
    setPhase("processing");
    try {
      setTranscript(text);
      setStatus("Sorting your day…");
      const { tz, now } = clientNow();
      const sRes = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, timeZone: tz, now }),
      });
      const sJson = await sRes.json();
      if (!sRes.ok) throw new Error(sJson.error || "Sorting failed");
      setResult(await fillAutoSchedule(sJson.result));
      setMock(Boolean(sJson.mock));
      setPhase("review");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("typing");
    }
  }

  async function handleConfirm(edited: SortResult) {
    setSaving(true);
    saveSortResult(edited, transcript, new Date().toISOString());
    // best-effort: push new events/todos to Google Calendar + Tasks if connected
    if (edited.events.length || edited.todos.length) {
      syncToGoogle({ events: edited.events, todos: edited.todos }).catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 450));
    setSaving(false);
    setPhase("kept");
    setTimeout(() => setOpen(false), 1600);
  }

  return (
    <RecordCtx.Provider value={{ open: openRecorder }}>
      {children}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
          >
            {phase === "review" ? (
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute inset-0 overflow-y-auto bg-bg"
              >
                <button
                  onClick={close}
                  className="card fixed right-5 top-5 z-30 grid h-10 w-10 place-items-center rounded-full"
                >
                  <X size={18} className="text-ink-soft" />
                </button>
                <Review
                  initial={result!}
                  mock={mock}
                  transcript={transcript}
                  onConfirm={handleConfirm}
                  onDiscard={close}
                  saving={saving}
                />
              </motion.div>
            ) : phase === "typing" ? (
              <div className="absolute inset-0 grid place-items-center overflow-hidden" style={{ background: "#0c0b10" }}>
                <div className="pointer-events-none absolute inset-0 opacity-90">
                  <FlowField
                    recording
                    analyser={analyser}
                    getLevel={() => Math.max(0, 1 - (Date.now() - lastKeyRef.current) / 700)}
                  />
                </div>
                <button
                  onClick={close}
                  className="absolute right-5 top-5 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur-md transition hover:bg-white/10"
                >
                  <X size={18} />
                </button>
                <div className="relative z-10 w-full max-w-2xl px-6">
                  <h2 className="mb-6 text-center font-serif text-4xl italic text-white sm:text-5xl">Write your day.</h2>
                  <textarea
                    autoFocus
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={() => (lastKeyRef.current = Date.now())}
                    placeholder="Just type it all out — what happened, what's on your mind, what you need to do…"
                    className="h-64 w-full resize-none rounded-2xl border border-white/15 bg-white/5 p-5 text-lg leading-relaxed text-white outline-none backdrop-blur-md placeholder:text-white/35"
                  />
                  <div className="mt-5 flex items-center justify-center gap-4">
                    <button onClick={() => setPhase("idle")} className="text-white/55 transition hover:text-white/85">
                      Back
                    </button>
                    <button
                      onClick={() => processText(typed)}
                      disabled={!typed.trim()}
                      className="flex items-center gap-2 rounded-full bg-accent px-7 py-3 text-white transition hover:brightness-105 disabled:opacity-40"
                    >
                      <Sparkles size={16} /> Sort it
                    </button>
                  </div>
                  {error && <p className="mt-3 text-center text-sm text-accent">{error}</p>}
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 grid place-items-center overflow-hidden" style={{ background: "#0c0b10" }}>
                <div className="pointer-events-none absolute inset-0 opacity-90">
                  <FlowField recording={recording} analyser={analyser} />
                </div>
                <button
                  onClick={close}
                  className="absolute right-5 top-5 z-30 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5 text-white/70 backdrop-blur-md transition hover:bg-white/10"
                >
                  <X size={18} />
                </button>

                <div className="relative z-10 flex flex-col items-center px-6">
                  {phase === "kept" ? (
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      <p className="font-serif text-5xl italic text-white">Offloaded.</p>
                      <p className="mt-3 text-white/60">Your day&apos;s in its place.</p>
                    </motion.div>
                  ) : (
                    <>
                      <motion.h2
                        key={phase === "processing" ? status : prompt}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-12 text-center font-serif text-5xl italic text-white sm:text-6xl"
                      >
                        {phase === "processing" ? status : prompt}
                      </motion.h2>

                      <RecordButton recording={recording} busy={phase === "processing"} onToggle={handleToggle} />

                      <div className="mt-9 flex h-12 items-center">
                        {recording ? (
                          <WavePill analyser={analyser} seconds={seconds} />
                        ) : phase === "processing" ? null : (
                          <p className="text-white/55">Tap and just talk — I&apos;ll sort the rest.</p>
                        )}
                      </div>

                      {!recording && phase !== "processing" && (
                        <div className="mt-5 flex max-w-lg flex-wrap items-center justify-center gap-2">
                          {[
                            "“Remind me to…” → task",
                            "“Meeting tomorrow at 2” → event",
                            "“Note that…” → note",
                            "“Today I…” → journal",
                          ].map((x) => (
                            <span
                              key={x}
                              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/45"
                            >
                              {x}
                            </span>
                          ))}
                        </div>
                      )}

                      {!recording && phase !== "processing" && (
                        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                          <button
                            onClick={() => fileRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/55 transition hover:text-white/85"
                          >
                            <Upload size={14} /> Upload a recording
                          </button>
                          <button
                            onClick={() => { setError(""); setPhase("typing"); }}
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-white/55 transition hover:text-white/85"
                          >
                            <Keyboard size={14} /> Type it out
                          </button>
                          <input
                            ref={fileRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => handleUpload(e.target.files?.[0])}
                          />
                        </div>
                      )}

                      {state === "denied" && (
                        <p className="mt-2 text-sm text-accent">
                          I need mic access — enable it in your browser settings.
                        </p>
                      )}
                      {error && <p className="mt-2 text-sm text-accent">{error}</p>}
                    </>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </RecordCtx.Provider>
  );
}
