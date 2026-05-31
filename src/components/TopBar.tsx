"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Mic } from "lucide-react";
import { useRecord } from "@/components/RecordProvider";
import ThemeToggle from "@/components/ThemeToggle";
import AccountMenu from "@/components/AccountMenu";

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
          y<span className="text-spectrum italic">offload</span>
        </Link>

        {/* centered pill — desktop */}
        <div className="hidden justify-center sm:flex">
          <NavPill />
        </div>

        <div className="flex items-center justify-end gap-2">
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
