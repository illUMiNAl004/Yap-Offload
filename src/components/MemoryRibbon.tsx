"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useDB } from "@/lib/store";

type Item =
  | { type: "photo"; url: string; label: string }
  | { type: "text"; text: string };

function prettyDay(key: string) {
  const d = new Date(key);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Piece({ it }: { it: Item }) {
  if (it.type === "photo") {
    return (
      <span className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={it.url} alt="" className="h-full w-full object-cover" />
        <span className="absolute bottom-1 left-1.5 font-serif text-xs text-white drop-shadow">
          {prettyDay(it.label)}
        </span>
      </span>
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 font-serif text-base italic text-ink-soft">
      <Sparkles size={12} className="text-accent" /> {it.text}
    </span>
  );
}

export default function MemoryRibbon() {
  const db = useDB();

  const items: Item[] = [];
  Object.entries(db.photos).forEach(([k, url]) => items.push({ type: "photo", url, label: k }));
  db.journal.slice(0, 12).forEach((j) =>
    j.highlights.forEach((h) => items.push({ type: "text", text: h })),
  );

  if (items.length < 3) return null;
  const row = [...items, ...items]; // duplicated for a seamless loop

  return (
    <footer className="mt-10 overflow-hidden border-t border-line py-5">
      <div className="mb-3 flex items-center gap-2 px-5 text-xs uppercase tracking-wider text-muted sm:px-8">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Memories
      </div>
      <Link href="/calendar" aria-label="Open your calendar of memories" className="block">
        <div className="marquee-track gap-3 px-3">
          {row.map((it, i) => (
            <Piece key={i} it={it} />
          ))}
        </div>
      </Link>
    </footer>
  );
}
