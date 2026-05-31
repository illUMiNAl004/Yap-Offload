"use client";

import { useEffect, useState } from "react";

export type Weather = { temp: number; label: string; code: number };

// WMO weather code → short label
function label(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 48) return "Foggy";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rainy";
  if (code <= 77) return "Snowy";
  if (code <= 82) return "Showers";
  if (code <= 86) return "Snow showers";
  return "Stormy";
}

/** Best-effort local weather via geolocation + open-meteo (free, no key). */
export function useWeather(): Weather | null {
  const [w, setW] = useState<Weather | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let alive = true;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const fahrenheit = !navigator.language || navigator.language.startsWith("en-US");
          const unit = fahrenheit ? "fahrenheit" : "celsius";
          const r = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=${unit}`,
          );
          const j = await r.json();
          if (!alive || !j?.current) return;
          setW({
            temp: Math.round(j.current.temperature_2m),
            code: j.current.weather_code,
            label: label(j.current.weather_code),
          });
        } catch {
          /* ignore — weather is a nicety */
        }
      },
      () => {},
      { timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );
    return () => {
      alive = false;
    };
  }, []);

  return w;
}

export function weatherIconName(code: number): string {
  if (code === 0) return "sun";
  if (code <= 3) return "cloud-sun";
  if (code <= 48) return "cloud-fog";
  if (code <= 67) return "cloud-rain";
  if (code <= 77) return "cloud-snow";
  if (code <= 86) return "cloud-snow";
  if (code <= 82) return "cloud-rain";
  return "cloud-lightning";
}
