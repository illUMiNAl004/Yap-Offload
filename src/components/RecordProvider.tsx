"use client";

import { createContext, useContext, useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { useRecorder } from "@/lib/useRecorder";
import FlowField from "@/components/FlowField";
import RecordButton from "@/components/RecordButton";
import WavePill from "@/components/WavePill";
import Review from "@/components/Review";
import { saveSortResult } from "@/lib/store";
import type { SortResult } from "@/lib/types";

type Phase = "idle" | "processing" | "review" | "kept";

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

  const openRecorder = useCallback(() => {
    setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
    setPhase("idle");
    setError("");
    setResult(null);
    setTranscript("");
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
      await process(blob);
    } else {
      await start();
    }
  }

  async function process(blob: Blob) {
    setPhase("processing");
    try {
      setStatus("Listening back…");
      const fd = new FormData();
      fd.append("audio", blob, "dump.webm");
      const tRes = await fetch("/api/transcribe", { method: "POST", body: fd });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error || "Transcription failed");
      setTranscript(tJson.text);

      setStatus("Sorting your day…");
      const sRes = await fetch("/api/sort", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: tJson.text,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const sJson = await sRes.json();
      if (!sRes.ok) throw new Error(sJson.error || "Sorting failed");
      setResult(sJson.result);
      setMock(Boolean(tJson.mock || sJson.mock));
      setPhase("review");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  }

  async function handleConfirm(edited: SortResult) {
    setSaving(true);
    saveSortResult(edited, transcript, new Date().toISOString());
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
