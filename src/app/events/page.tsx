"use client";

import { motion } from "motion/react";
import { MapPin, Trash2, Clock } from "lucide-react";
import { useDB, remove, type StoredEvent } from "@/lib/store";
import { fmtDay, fmtTime, isPast } from "@/lib/format";
import PageShell from "@/components/PageShell";
import { EventComposer } from "@/components/AddForms";

function EventCard({ ev, i }: { ev: StoredEvent; i: number }) {
  const d = new Date(ev.start);
  const month = isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { month: "short" });
  const day = isNaN(d.getTime()) ? "" : d.getDate().toString();
  return (
    <motion.li
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="card card-hover group flex items-stretch gap-4 p-4"
    >
      <div className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-event/10 py-2">
        <span className="text-xs uppercase text-event">{month}</span>
        <span className="font-serif text-2xl text-ink">{day}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{ev.title}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-event">
          <span className="flex items-center gap-1">
            <Clock size={13} />
            {ev.allDay ? "All day" : `${fmtDay(ev.start)}, ${fmtTime(ev.start)}`}
          </span>
          {ev.location && (
            <span className="flex items-center gap-1">
              <MapPin size={13} /> {ev.location}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => remove("events", ev.id)}
        className="self-start opacity-0 transition group-hover:opacity-100"
      >
        <Trash2 size={15} className="text-muted hover:text-accent" />
      </button>
    </motion.li>
  );
}

export default function EventsPage() {
  const db = useDB();
  const sorted = [...db.events].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const upcoming = sorted.filter((e) => !isPast(e.start));
  const past = sorted.filter((e) => isPast(e.start)).reverse();

  return (
    <PageShell
      title="Events"
      accent="var(--color-event)"
      subtitle="The plans, meetings, and moments you mentioned."
      count={db.events.length}
      empty="No events yet. Add one below, or mention plans out loud."
      addSlot={<EventComposer />}
    >
      <div className="space-y-8">
        {upcoming.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Upcoming</h2>
            <ul className="space-y-3">
              {upcoming.map((ev, i) => (
                <EventCard key={ev.id} ev={ev} i={i} />
              ))}
            </ul>
          </section>
        )}
        {past.length > 0 && (
          <section className="opacity-70">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted">Past</h2>
            <ul className="space-y-3">
              {past.map((ev, i) => (
                <EventCard key={ev.id} ev={ev} i={i} />
              ))}
            </ul>
          </section>
        )}
      </div>
    </PageShell>
  );
}
