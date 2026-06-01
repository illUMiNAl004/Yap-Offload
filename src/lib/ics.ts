"use client";

import type { CalEvent } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");

function utc(d: Date) {
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}
function localDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Build an iCalendar (.ics) string for one event. */
export function eventToICS(ev: Pick<CalEvent, "title" | "start" | "end" | "location" | "allDay">): string {
  const start = new Date(ev.start);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@yoffload`;
  const stamp = utc(new Date());

  let dtStart: string;
  let dtEnd: string;
  if (ev.allDay) {
    const next = new Date(start);
    next.setDate(next.getDate() + 1);
    dtStart = `DTSTART;VALUE=DATE:${localDate(start)}`;
    dtEnd = `DTEND;VALUE=DATE:${localDate(next)}`;
  } else {
    const end = ev.end ? new Date(ev.end) : new Date(start.getTime() + 60 * 60 * 1000);
    dtStart = `DTSTART:${utc(start)}`;
    dtEnd = `DTEND:${utc(end)}`;
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//yoffload//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${esc(ev.title)}`,
    ev.location ? `LOCATION:${esc(ev.location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

/** Download an .ics — opening it adds the event to Apple/Google Calendar. */
export function addToCalendar(ev: Pick<CalEvent, "title" | "start" | "end" | "location" | "allDay">) {
  const blob = new Blob([eventToICS(ev)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(ev.title || "event").replace(/[^\w\s-]/g, "").slice(0, 40) || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
