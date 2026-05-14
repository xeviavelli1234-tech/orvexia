/**
 * Decorative futuristic FX layer: floating particles + occasional data streams
 * + an optional diagonal beam. Render inside a positioned + overflow-hidden parent.
 * Pure CSS animations (no JS), safe to render as a server component.
 */
const PARTICLE_COLORS = ["#5EEAD4", "#A78BFA", "#F0ABFC", "#A3E635", "#818CF8", "#FBBF24"];
const STREAM_COLORS = [
  "rgba(94,234,212,0.5)",
  "rgba(240,171,252,0.45)",
  "rgba(129,140,248,0.45)",
  "rgba(163,230,53,0.4)",
];

// Deterministic pseudo-random so SSR + client match
function rand(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function FuturisticFX({
  particleCount = 6,
  streamCount = 3,
  beam = true,
  seed = 1,
}: {
  particleCount?: number;
  streamCount?: number;
  beam?: boolean;
  seed?: number;
}) {
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const s = seed * 7 + i;
    return {
      left: 5 + rand(s) * 90,
      delay: rand(s + 0.5) * 10,
      duration: 8 + rand(s + 1) * 7,
      drift: -30 + rand(s + 2) * 60,
      color: PARTICLE_COLORS[Math.floor(rand(s + 3) * PARTICLE_COLORS.length)],
    };
  });

  const streams = Array.from({ length: streamCount }, (_, i) => {
    const s = seed * 13 + i * 3;
    return {
      side: rand(s) > 0.5 ? "left" : "right",
      pos: 3 + rand(s + 0.7) * 12,
      top: rand(s + 1) * 50,
      duration: 6 + rand(s + 2) * 6,
      delay: rand(s + 3) * 8,
      color: STREAM_COLORS[Math.floor(rand(s + 4) * STREAM_COLORS.length)],
    };
  });

  return (
    <>
      {particles.map((p, i) => (
        <span
          key={`p-${i}`}
          className="particle"
          style={{
            left: `${p.left}%`,
            bottom: "0%",
            ['--c' as string]: p.color,
            ['--d' as string]: `${p.duration}s`,
            ['--delay' as string]: `${p.delay}s`,
            ['--x' as string]: `${p.drift}px`,
          }}
        />
      ))}
      {streams.map((s, i) => (
        <span
          key={`s-${i}`}
          className="data-stream"
          style={{
            [s.side]: `${s.pos}%`,
            top: `${s.top}%`,
            ['--c' as string]: s.color,
            ['--d' as string]: `${s.duration}s`,
            ['--delay' as string]: `${s.delay}s`,
          }}
        />
      ))}
      {beam && (
        <div
          className="beam-sweep"
          style={{ ['--delay' as string]: `${(seed * 1.7) % 6}s` }}
        />
      )}
    </>
  );
}
