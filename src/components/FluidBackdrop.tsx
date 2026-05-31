/** Drifting glass light — invisible in light mode, alive in dark (CSS-gated). */
export default function FluidBackdrop() {
  const blobs = [
    { c: "#ff6a2b", top: "-8%", left: "-6%", size: 46, a: "drift1 28s ease-in-out infinite", o: 0.5 },
    { c: "#ff3d6e", top: "20%", left: "62%", size: 42, a: "drift2 34s ease-in-out infinite", o: 0.4 },
    { c: "#7a4bff", top: "58%", left: "12%", size: 50, a: "drift3 40s ease-in-out infinite", o: 0.38 },
    { c: "#ffb23e", top: "70%", left: "68%", size: 38, a: "drift1 32s ease-in-out infinite reverse", o: 0.32 },
  ];
  return (
    <div aria-hidden className="fluid">
      {blobs.map((b, i) => (
        <span
          key={i}
          style={{
            top: b.top,
            left: b.left,
            width: `${b.size}vmax`,
            height: `${b.size}vmax`,
            background: `radial-gradient(circle at center, ${b.c} 0%, transparent 64%)`,
            opacity: b.o,
            animation: b.a,
          }}
        />
      ))}
    </div>
  );
}
