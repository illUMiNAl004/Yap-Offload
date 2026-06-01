"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

type Ctx = {
  secs: number;
  total: number;
  running: boolean;
  toggle: () => void;
  reset: () => void;
  setPreset: (min: number) => void;
};

const PomCtx = createContext<Ctx | null>(null);
export const usePomodoro = () => {
  const c = useContext(PomCtx);
  if (!c) throw new Error("usePomodoro outside provider");
  return c;
};

export default function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [total, setTotal] = useState(25 * 60);
  const [secs, setSecs] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = setInterval(() => {
        setSecs((s) => {
          if (s <= 1) {
            setRunning(false);
            // gentle chime via Web Audio
            try {
              const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
              const ctx = new Ctor();
              const o = ctx.createOscillator();
              const g = ctx.createGain();
              o.frequency.value = 660;
              o.connect(g);
              g.connect(ctx.destination);
              g.gain.setValueAtTime(0.0001, ctx.currentTime);
              g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
              g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
              o.start();
              o.stop(ctx.currentTime + 1.2);
            } catch {}
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => {
      if (ref.current) clearInterval(ref.current);
    };
  }, [running]);

  const toggle = () => setRunning((r) => !r);
  const reset = () => {
    setRunning(false);
    setSecs(total);
  };
  const setPreset = (min: number) => {
    setRunning(false);
    setTotal(min * 60);
    setSecs(min * 60);
  };

  return <PomCtx.Provider value={{ secs, total, running, toggle, reset, setPreset }}>{children}</PomCtx.Provider>;
}
