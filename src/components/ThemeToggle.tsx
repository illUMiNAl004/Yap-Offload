"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("yoffload.theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-soft transition hover:text-ink"
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex h-9 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-ink-soft transition hover:bg-surface-2"
    >
      <span className="relative grid h-5 w-5 place-items-center">
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {dark ? <Moon size={16} className="text-accent" /> : <Sun size={16} className="text-accent" />}
        </motion.span>
      </span>
      {dark ? "Dark" : "Light"} mode
    </button>
  );
}
