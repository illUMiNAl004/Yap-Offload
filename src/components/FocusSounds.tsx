"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Upload, Headphones } from "lucide-react";

type Mode = "gamma" | "alpha" | "theta" | "brown" | "file";

const MODES: { key: Mode; label: string; hint: string }[] = [
  { key: "gamma", label: "Focus", hint: "40 Hz · deep work" },
  { key: "alpha", label: "Flow", hint: "10 Hz · relaxed focus" },
  { key: "theta", label: "Calm", hint: "6 Hz · wind down" },
  { key: "brown", label: "Brown noise", hint: "steady hush" },
  { key: "file", label: "My track", hint: "lofi / your file" },
];
const BEAT: Record<string, number> = { gamma: 40, alpha: 10, theta: 6 };

export default function FocusSounds() {
  const [mode, setMode] = useState<Mode>("gamma");
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
      a.play();
      return;
    }
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = ctxRef.current ?? new Ctx();
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
      const beat = BEAT[mode];
      const merger = ctx.createChannelMerger(2);
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();
      oscL.frequency.value = carrier;
      oscR.frequency.value = carrier + beat;
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
    const next = !playing;
    setPlaying(next);
    if (next) start();
    else teardown();
  };

  // live volume
  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = vol;
    if (audioRef.current) audioRef.current.volume = vol;
  }, [vol]);

  // switching mode while playing restarts the source
  useEffect(() => {
    if (playing) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => () => teardown(), []);

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-2xl text-ink">Focus sounds</h3>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Headphones size={13} /> use headphones for binaural
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className="rounded-full border px-3.5 py-1.5 text-sm transition"
            style={{
              borderColor: mode === m.key ? "var(--color-accent)" : "var(--color-line)",
              color: mode === m.key ? "var(--color-accent)" : "var(--color-muted)",
            }}
            title={m.hint}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-4">
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-white transition hover:brightness-105"
        >
          {playing ? <Pause size={18} /> : <Play size={18} />} {playing ? "Pause" : "Play"}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => setVol(parseFloat(e.target.value))}
          className="flex-1 accent-[var(--color-accent)]"
          aria-label="Volume"
        />
        {mode === "file" && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm text-ink-soft transition hover:text-ink"
          >
            <Upload size={14} /> {fileName ? "Change" : "Load file"}
          </button>
        )}
      </div>
      {mode === "file" && fileName && <p className="mt-2 text-xs text-muted">Playing: {fileName}</p>}

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
          if (playing) start();
        }}
      />
    </div>
  );
}
