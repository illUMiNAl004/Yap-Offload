"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check, Plug, Unplug, Trash2, LogOut, Sun, Moon } from "lucide-react";
import { useAuth, displayName } from "@/lib/auth";
import { isGoogleConnected, disconnectGoogle } from "@/lib/google";
import { clearAllData } from "@/lib/store";

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-7">
      <h2 className="font-serif text-2xl text-ink">{title}</h2>
      {desc && <p className="mt-1 text-muted">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { user, setName, connectGoogle, signOut } = useAuth();
  const [name, setNameVal] = useState("");
  const [savedName, setSavedName] = useState(false);
  const [dark, setDark] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    setNameVal(displayName(user));
    setDark(document.documentElement.classList.contains("dark"));
    isGoogleConnected().then(setConnected);
  }, [user]);

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("yoffload.theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  };

  const saveName = async () => {
    await setName(name);
    setSavedName(true);
    setTimeout(() => setSavedName(false), 1500);
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-24 pt-6 sm:px-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 font-serif text-5xl tracking-tight text-ink sm:text-6xl"
      >
        Settings<span className="text-accent">.</span>
      </motion.h1>

      <div className="space-y-5">
        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex gap-3">
            <button
              onClick={() => dark && toggleTheme()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition"
              style={{ borderColor: !dark ? "var(--color-accent)" : "var(--color-line)", color: !dark ? "var(--color-accent)" : "var(--color-muted)" }}
            >
              <Sun size={17} /> Light
            </button>
            <button
              onClick={() => !dark && toggleTheme()}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 transition"
              style={{ borderColor: dark ? "var(--color-accent)" : "var(--color-line)", color: dark ? "var(--color-accent)" : "var(--color-muted)" }}
            >
              <Moon size={17} /> Dark
            </button>
          </div>
        </Section>

        {/* Profile */}
        <Section title="Profile" desc="What yapload calls you.">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={name}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="Your name"
              className="flex-1 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-ink outline-none"
            />
            <button
              onClick={saveName}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-white transition hover:brightness-105"
            >
              {savedName ? <Check size={16} /> : null} {savedName ? "Saved" : "Save"}
            </button>
          </div>
        </Section>

        {/* Connections */}
        <Section
          title="Connections"
          desc="Connect Google to auto-send spoken events to your Calendar and todos to Google Tasks."
        >
          <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-2 p-4">
            <div>
              <p className="font-medium text-ink">Google Calendar &amp; Tasks</p>
              <p className="text-sm text-muted">
                {connected === null ? "Checking…" : connected ? "Connected — events & todos sync automatically." : "Not connected."}
              </p>
            </div>
            {connected ? (
              <button
                onClick={async () => {
                  await disconnectGoogle();
                  setConnected(false);
                }}
                className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm text-ink-soft transition hover:text-accent"
              >
                <Unplug size={15} /> Disconnect
              </button>
            ) : (
              <button
                onClick={connectGoogle}
                className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-sm text-surface transition hover:opacity-90"
              >
                <Plug size={15} /> Connect
              </button>
            )}
          </div>
        </Section>

        {/* Data */}
        <Section title="Your data" desc="Everything is yours. Export or wipe it anytime.">
          <button
            onClick={async () => {
              if (
                confirm(
                  "Delete ALL your journal, tasks, events, notes, and photos? This cannot be undone.",
                )
              ) {
                await clearAllData();
                alert("All data cleared.");
              }
            }}
            className="flex items-center gap-2 rounded-full border border-accent/40 px-5 py-2.5 text-accent transition hover:bg-accent/10"
          >
            <Trash2 size={16} /> Clear all data
          </button>
        </Section>

        {/* Account */}
        <Section title="Account">
          <div className="flex items-center justify-between gap-4">
            <p className="text-ink-soft">{user?.email}</p>
            <button
              onClick={signOut}
              className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-ink-soft transition hover:text-ink"
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </Section>
      </div>
    </main>
  );
}
