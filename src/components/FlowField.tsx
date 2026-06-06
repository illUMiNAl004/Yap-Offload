"use client";

import { useEffect, useRef } from "react";

/**
 * The signature visualization: flowing, domain-warped contour lines (à la the
 * topographic reference). Idle, they drift slowly; while recording, the field
 * swells and accelerates with the user's voice. Pure canvas + value noise.
 */

// --- compact value noise ---
const perm = new Uint8Array(512);
(() => {
  for (let i = 0; i < 256; i++) perm[i] = i;
  let s = 1357924680;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
})();
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function noise(x: number, y: number) {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);
  const aa = perm[perm[xi] + yi] / 255;
  const ba = perm[perm[xi + 1] + yi] / 255;
  const ab = perm[perm[xi] + yi + 1] / 255;
  const bb = perm[perm[xi + 1] + yi + 1] / 255;
  return lerp(lerp(aa, ba, u), lerp(ab, bb, u), v);
}

type Props = {
  recording: boolean;
  analyser: React.RefObject<AnalyserNode | null>;
  /** optional external 0..1 level source (e.g. typing energy) — overrides audio */
  getLevel?: () => number;
};

export default function FlowField({ recording, analyser, getLevel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recRef = useRef(recording);
  recRef.current = recording;
  const getLevelRef = useRef(getLevel);
  getLevelRef.current = getLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const freq = new Uint8Array(64);
    let level = 0; // smoothed voice level 0..1
    let t = 0;
    let raf = 0;

    const readLevel = () => {
      if (getLevelRef.current) return Math.min(1, Math.max(0, getLevelRef.current()));
      const a = analyser.current;
      if (!a || !recRef.current) return 0;
      a.getByteFrequencyData(freq);
      let sum = 0;
      for (let i = 0; i < freq.length; i++) sum += freq[i];
      return Math.min(1, sum / freq.length / 110);
    };

    const draw = () => {
      const target = readLevel();
      level += (target - level) * 0.08;
      const speed = recRef.current ? 0.0042 + level * 0.012 : 0.0016;
      t += speed;

      ctx.clearRect(0, 0, w, h);

      const gap = 8;
      const step = 11;
      const amp = 26 + level * 150;
      const warpAmt = 80 + level * 220;
      const baseAlpha = recRef.current ? 0.42 + level * 0.4 : 0.26;

      for (let y = -20; y < h + 20; y += gap) {
        ctx.beginPath();
        for (let x = -20; x <= w + 20; x += step) {
          // domain warp: offset sampling coords by a low-freq noise field
          const wx = noise(x * 0.0015 + t, y * 0.0015) - 0.5;
          const wy = noise(x * 0.0015, y * 0.0015 + t * 0.6) - 0.5;
          const n = noise(
            (x + wx * warpAmt) * 0.0022 + t,
            (y + wy * warpAmt) * 0.0022,
          );
          const dy = (n - 0.5) * 2 * amp;
          const py = y + dy;
          if (x <= -20) ctx.moveTo(x, py);
          else ctx.lineTo(x, py);
        }
        // brighter near vertical center for depth
        const centerFade = 1 - Math.abs(y - h / 2) / (h * 0.75);
        ctx.strokeStyle = `rgba(244,241,234,${baseAlpha * Math.max(0.25, centerFade)})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [analyser]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
