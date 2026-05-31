"use client";

import { useCallback, useRef, useState } from "react";

export type RecorderState = "idle" | "recording" | "denied";

/**
 * Records mic audio and exposes a live AnalyserNode so the UI can breathe
 * with the user's voice. stop() resolves with the recorded audio Blob.
 */
export function useRecorder() {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // analyser for the live waveform
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;

      const mime = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRef.current = recorder;

      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      setState("recording");
    } catch (err) {
      console.error("mic error", err);
      setState("denied");
    }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRef.current;
      if (!recorder) {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        cleanup();
        setState("idle");
        resolve(blob.size > 0 ? blob : null);
      };
      recorder.stop();
    });
  }, [cleanup]);

  /** Read the current normalized volume (0..1) — for the breathing orb. */
  const getLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) sum += data[i];
    return Math.min(1, sum / data.length / 128);
  }, []);

  return { state, seconds, start, stop, getLevel, analyser: analyserRef };
}
