"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

export type SoundMode = "gamma" | "alpha" | "theta" | "brown" | "file";

export const SOUND_MODES: { key: SoundMode; label: string; hint: string }[] = [
  { key: "gamma", label: "Focus", hint: "40 Hz · deep work" },
  { key: "alpha", label: "Flow", hint: "10 Hz · relaxed focus" },
  { key: "theta", label: "Calm", hint: "6 Hz · wind down" },
  { key: "brown", label: "Brown noise", hint: "steady hush" },
  { key: "file", label: "My track", hint: "lofi / your file" },
];
const BEAT: Record<string, number> = { gamma: 40, alpha: 10, theta: 6 };

type Ctx = {
  mode: SoundMode;
  playing: boolean;
  vol: number;
  fileName: string;
  setMode: (m: SoundMode) => void;
  setVol: (v: number) => void;
  toggle: () => void;
  pickFile: () => void;
};

const SoundCtx = createContext<Ctx | null>(null);
export const useFocusSound = () => {
  const c = useContext(SoundCtx);
  if (!c) throw new Error("useFocusSound outside provider");
  return c;
};

export default function FocusSoundProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<SoundMode>("gamma");
  const [playing, setPlaying] = useState(false);
  const [vol, setVol] = useState(0.4);
  const [fileName, setFileName] = useState("");

  const ctxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileUrlRef = useRef<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const teardown = () => {
    nodesRef.current.forEach((n) => {
      try {
        // @ts-expect-error stop exists on sources
        n.stop?.();
        n.disconnect();
      } catch {}
    });
    nodesRef.current = [];
    audioRef.current?.pause();
  };

  const start = () => {
    teardown();
    if (mode === "file") {
      if (!fileUrlRef.current) {
        inputRef.current?.click();
        return;
      }
      const a = audioRef.current!;
      a.volume = vol;
      a.loop = true;
      a.play().catch(() => {});
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new Ctor();
    ctxRef.current = ctx;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    gain.connect(ctx.destination);
    gainRef.current = gain;

    if (mode === "brown") {
      const size = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < size; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gain);
      src.start();
      nodesRef.current = [src];
    } else {
      const carrier = 200;
      const merger = ctx.createChannelMerger(2);
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.frequency.value = carrier;
      oscR.frequency.value = carrier + BEAT[mode];
      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);
      merger.connect(gain);
      oscL.start();
      oscR.start();
      nodesRef.current = [oscL, oscR, merger];
    }
    ctx.resume();
  };

  const toggle = () => {
    setPlaying((p) => !p);
  };
  const pickFile = () => inputRef.current?.click();

  // (re)start when play state or mode changes — provider stays mounted across routes
  useEffect(() => {
    if (playing) start();
    else teardown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, mode]);

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = vol;
    if (audioRef.current) audioRef.current.volume = vol;
  }, [vol]);

  useEffect(() => () => teardown(), []);

  return (
    <SoundCtx.Provider value={{ mode, playing, vol, fileName, setMode, setVol, toggle, pickFile }}>
      {children}
      <audio ref={audioRef} className="hidden" />
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
          fileUrlRef.current = URL.createObjectURL(f);
          setFileName(f.name);
          if (audioRef.current) audioRef.current.src = fileUrlRef.current;
          setMode("file");
          if (!playing) setPlaying(true);
          else start();
        }}
      />
    </SoundCtx.Provider>
  );
}
