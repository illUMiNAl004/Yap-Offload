"use client";

import { useEffect, useState } from "react";

/** Tiny localStorage-backed boolean preference (per device). */
export function usePref(key: string, def: boolean) {
  const [v, setV] = useState(def);
  useEffect(() => {
    try {
      const s = localStorage.getItem("yapload." + key);
      if (s != null) setV(s === "1");
    } catch {}
  }, [key]);
  const set = (nv: boolean) => {
    setV(nv);
    try {
      localStorage.setItem("yapload." + key, nv ? "1" : "0");
    } catch {}
  };
  return [v, set] as const;
}
