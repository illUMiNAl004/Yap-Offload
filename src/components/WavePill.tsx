"use client";

import { useEffect, useRef } from "react";

/** Live voice-note pill — frosted dark pill, real-time bars + timer. */
export default function WavePill({
  analyser,
  seconds,
}: {
  analyser: React.RefObject<AnalyserNode | null>;
  seconds: number;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const BARS = 32;

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const bars = Array.from(wrap.children) as HTMLElement[];
    const data = new Uint8Array(64);
    let raf = 0;
    const tick = () => {
      const a = analyser.current;
      if (a) {
        a.getByteFrequencyData(data);
        for (let i = 0; i < BARS; i++) {
          const v = data[Math.floor((i / BARS) * 56)] / 255;
          bars[i].style.height = `${3 + v * 26}px`;
          bars[i].style.opacity = `${0.45 + v * 0.55}`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [analyser]);

  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toString().padStart(2, "0");

  return (
    <div
      className="flex items-center gap-3 rounded-full px-5 py-3"
      style={{
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.16)",
        backdropFilter: "blur(16px)",
      }}
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <div ref={wrapRef} className="flex h-8 items-center gap-[3px]">
        {Array.from({ length: BARS }).map((_, i) => (
          <span key={i} className="w-[3px] rounded-full bg-white" style={{ height: 3 }} />
        ))}
      </div>
      <span className="font-sans text-sm tabular-nums text-white/80">
        {m}:{s}
      </span>
    </div>
  );
}
