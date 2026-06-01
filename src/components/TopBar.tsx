"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Headphones, Timer, Play, Pause, RotateCcw } from "lucide-react";
import { useRecord } from "@/components/RecordProvider";
import { useFocusSound } from "@/components/FocusSoundProvider";
import { usePomodoro } from "@/components/PomodoroProvider";
import SoundControls from "@/components/SoundControls";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";

function PomodoroButton() {
  const { secs, running, toggle, reset, setPreset } = usePomodoro();
  const [open, setOpen] = useState(false);
  const mm = Math.floor(secs / 60).toString().padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Focus timer"
        className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1.5 text-sm transition"
        style={{ color: running ? "var(--color-accent)" : "var(--color-muted)" }}
      >
        <Timer size={16} />
        {running && <span className="tabular-nums">{mm}:{ss}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              className="card absolute right-0 z-50 mt-2 w-64 p-5 text-center"
            >
              <p className="font-serif text-6xl tabular-nums text-ink" style={{ color: secs === 0 ? "var(--color-accent)" : undefined }}>
                {mm}:{ss}
              </p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button onClick={toggle} className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-white transition hover:brightness-105">
                  {running ? <Pause size={16} /> : <Play size={16} />} {running ? "Pause" : "Start"}
                </button>
                <button onClick={reset} className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink-soft hover:text-ink">
                  <RotateCcw size={16} />
                </button>
              </div>
              <div className="mt-4 flex justify-center gap-2 text-sm text-muted">
                {[25, 15, 5, 90].map((m) => (
                  <button key={m} onClick={() => setPreset(m)} className="rounded-full border border-line px-3 py-1 transition hover:text-ink">{m}m</button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SoundButton() {
  const { playing } = useFocusSound();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Focus sounds"
        className="relative grid h-9 w-9 place-items-center rounded-full border border-line transition"
        style={{ color: playing ? "var(--color-accent)" : "var(--color-muted)" }}
      >
        <Headphones size={16} />
        {playing && (
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: "0 0 0 2px var(--color-accent)" }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              className="card absolute right-0 z-50 mt-2 w-80 p-4"
            >
              <SoundControls compact />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const NAV = [
  { href: "/", label: "Today" },
  { href: "/journal", label: "Journal" },
  { href: "/tasks", label: "Tasks" },
  { href: "/calendar", label: "Calendar" },
  { href: "/notes", label: "Notes" },
];

function NavPill() {
  const path = usePathname();
  return (
    <nav className="glassy flex items-center gap-0.5 rounded-full border border-line p-1.5 shadow-[var(--shadow-card)]">
      {NAV.map((item) => {
        const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="relative rounded-full px-4 py-1.5 text-[15px]"
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-surface shadow-[var(--shadow-card)]"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className={`relative transition-colors ${active ? "text-ink" : "text-muted hover:text-accent"}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function TopBar() {
  const { open } = useRecord();
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:px-8">
        <Link href="/" className="font-serif text-2xl tracking-tight text-ink">
          yap<span className="text-spectrum italic">load</span>
        </Link>

        {/* centered pill — desktop */}
        <div className="hidden justify-center sm:flex">
          <NavPill />
        </div>

        <div className="flex items-center justify-end gap-2">
          <PomodoroButton />
          <SoundButton />
          <ThemeToggle compact />
          <button
            onClick={open}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[15px] text-white shadow-[0_10px_28px_-10px_var(--color-accent)] transition hover:brightness-105"
          >
            <Mic size={16} /> Talk
          </button>
          <AccountMenu />
        </div>
      </div>

      {/* mobile nav row */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto px-5 pb-3 sm:hidden">
        <MobileNav />
      </div>
    </header>
  );
}

function MobileNav() {
  const path = usePathname();
  return (
    <>
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[15px] ${
              active ? "glassy border border-line text-ink shadow-[var(--shadow-card)]" : "text-muted"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </>
  );
}
