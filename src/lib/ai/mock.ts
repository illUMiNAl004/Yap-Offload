import { SortResult } from "@/lib/types";

/**
 * Demo data so the full experience works before any API key is set.
 * Everything returned here is clearly flagged as "demo" in the UI.
 */

export const MOCK_TRANSCRIPT =
  "Okay so today was honestly pretty good. I finally pushed the auth refactor and it felt amazing to get it off my plate. Um, I need to remember to email Sarah back about the design review, that's kind of urgent actually. Oh and I have my dentist appointment tomorrow at 3pm, don't let me forget that. I also want to call mom this weekend, it's been too long. I learned this cool thing today about Postgres row level security, basically you can enforce access rules right at the database layer which is way cleaner than doing it in the app. I'm feeling a little tired but good, like I'm finally getting into a rhythm with this project.";

function atHour(daysFromNow: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function mockSort(_text: string): SortResult {
  return {
    journal:
      "Today felt like a good one. I finally pushed the auth refactor — it was such a relief to get that off my plate after it had been hanging over me. There's a quiet satisfaction in clearing something that big. I'm a little tired, but it's the good kind: I can feel myself settling into a real rhythm with this project, and that momentum matters more than any single win.",
    highlights: [
      "Shipped the auth refactor — big relief.",
      "Finally finding a rhythm with the project.",
      "Tired but genuinely content today.",
    ],
    todos: [
      { title: "Email Sarah back about the design review", due: null, priority: "high" },
      { title: "Call mom", due: atHour(2, 11).slice(0, 10), priority: "normal" },
    ],
    events: [
      {
        title: "Dentist appointment",
        start: atHour(1, 15),
        end: null,
        location: null,
        allDay: false,
      },
    ],
    notes: [
      {
        title: "Postgres Row Level Security",
        body: "You can enforce access rules directly at the database layer with RLS, rather than scattering them through the app code — cleaner and harder to bypass.",
      },
    ],
  };
}
