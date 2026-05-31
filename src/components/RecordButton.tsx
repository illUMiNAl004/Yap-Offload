"use client";

import { Mic, Square } from "lucide-react";
import { motion } from "motion/react";

type Props = {
  recording: boolean;
  busy: boolean;
  onToggle: () => void;
};

/** The record control, used inside the dim recording overlay. */
export default function RecordButton({ recording, busy, onToggle }: Props) {
  return (
    <motion.button
      onClick={onToggle}
      disabled={busy}
      aria-label={recording ? "Stop and sort" : "Start talking"}
      className="group relative grid place-items-center rounded-full disabled:cursor-wait"
      style={{ width: 112, height: 112 }}
      whileHover={{ scale: busy ? 1 : 1.04 }}
      whileTap={{ scale: busy ? 1 : 0.96 }}
    >
      {recording && (
        <>
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(217,82,46,0.45), transparent 70%)" }}
            animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.span
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(217,82,46,0.45), transparent 70%)" }}
            animate={{ scale: [1, 1.9], opacity: [0.6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.9 }}
          />
        </>
      )}

      <motion.span
        className="absolute inset-0 rounded-full border"
        style={{
          background: recording ? "#d9522e" : "rgba(255,255,255,0.95)",
          borderColor: recording ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)",
          boxShadow: "0 18px 50px -16px rgba(0,0,0,0.6)",
        }}
        animate={busy ? { opacity: [1, 0.6, 1] } : {}}
        transition={{ duration: 1, repeat: busy ? Infinity : 0 }}
      />

      <span className="relative z-10">
        {recording ? (
          <Square size={26} fill="#fff" strokeWidth={0} />
        ) : (
          <Mic size={34} strokeWidth={1.7} color={busy ? "#d9522e" : "#1b1a18"} />
        )}
      </span>
    </motion.button>
  );
}
