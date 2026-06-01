"use client";

import { Play, Pause, Upload, Headphones } from "lucide-react";
import { useFocusSound, SOUND_MODES } from "@/components/FocusSoundProvider";

export default function SoundControls({ compact = false }: { compact?: boolean }) {
  const { mode, playing, vol, fileName, setMode, setVol, toggle, pickFile } = useFocusSound();

  return (
    <div className={compact ? "" : "card p-6"}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className={compact ? "font-medium text-ink" : "font-serif text-2xl text-ink"}>Focus sounds</h3>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Headphones size={13} /> headphones for binaural
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {SOUND_MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            title={m.hint}
            className="rounded-full border px-3 py-1.5 text-sm transition"
            style={{
              borderColor: mode === m.key ? "var(--color-accent)" : "var(--color-line)",
              color: mode === m.key ? "var(--color-accent)" : "var(--color-muted)",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-white transition hover:brightness-105"
        >
          {playing ? <Pause size={17} /> : <Play size={17} />} {playing ? "Pause" : "Play"}
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
          <button onClick={pickFile} className="flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm text-ink-soft transition hover:text-ink">
            <Upload size={14} /> {fileName ? "Change" : "Load"}
          </button>
        )}
      </div>
      {mode === "file" && fileName && <p className="mt-2 truncate text-xs text-muted">Playing: {fileName}</p>}
      {!compact && (
        <p className="mt-3 text-xs text-muted">Keeps playing in the background as you move around the app.</p>
      )}
    </div>
  );
}
