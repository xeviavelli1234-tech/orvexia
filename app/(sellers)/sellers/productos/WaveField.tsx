"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo animado: rejilla de partículas en perspectiva que ondula como una
 * superficie 3D (estilo "data terrain"), en tonos cian/azul/violeta.
 * Canvas + requestAnimationFrame. Respeta prefers-reduced-motion.
 */
export default function WaveField() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const c = cv.getContext("2d");
    if (!c) return;
    const canvas: HTMLCanvasElement = cv;
    const ctx: CanvasRenderingContext2D = c;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;

    const COLS = 76;
    const ROWS = 50;

    function resize() {
      const parent = canvas.parentElement;
      const rect = parent
        ? parent.getBoundingClientRect()
        : { width: window.innerWidth, height: window.innerHeight };
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.floor(rect.width));
      h = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // cian → azul → violeta
    function tint(t: number, a: number): string {
      // t: 0..1
      let r: number, g: number, b: number;
      if (t < 0.5) {
        const k = t / 0.5;
        r = Math.round(34 + k * (99 - 34));
        g = Math.round(211 + k * (102 - 211));
        b = Math.round(238 + k * (241 - 238));
      } else {
        const k = (t - 0.5) / 0.5;
        r = Math.round(99 + k * (168 - 99));
        g = Math.round(102 + k * (85 - 102));
        b = Math.round(241 + k * (247 - 241));
      }
      return `rgba(${r},${g},${b},${a})`;
    }

    function frame(time: number) {
      const tm = time * 0.001;
      ctx.clearRect(0, 0, w, h);

      // Velo de color para que el fondo no sea negro puro
      const g1 = ctx.createRadialGradient(
        w * 0.32, h * 0.42, 0,
        w * 0.32, h * 0.42, Math.max(w, h) * 0.75,
      );
      g1.addColorStop(0, "rgba(40,70,140,0.30)");
      g1.addColorStop(1, "rgba(8,10,30,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);
      const g2 = ctx.createRadialGradient(
        w * 0.74, h * 0.66, 0,
        w * 0.74, h * 0.66, Math.max(w, h) * 0.7,
      );
      g2.addColorStop(0, "rgba(96,40,150,0.24)");
      g2.addColorStop(1, "rgba(8,10,30,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2;
      const horizon = -h * 0.06;
      const spanX = w * 1.75;

      for (let j = 0; j < ROWS; j++) {
        // jn: 0 (lejos) → 1 (cerca)
        const jn = j / (ROWS - 1);
        const persp = Math.pow(jn, 1.28); // reparte por toda la altura
        const scale = 0.42 + persp * 0.95;
        const rowY = horizon + persp * (h * 1.12);

        for (let i = 0; i < COLS; i++) {
          const inx = i / (COLS - 1);

          const wave =
            Math.sin(i * 0.32 + tm * 1.2 + j * 0.15) * 22 +
            Math.sin(j * 0.4 + tm * 0.95) * 16 +
            Math.sin((i + j) * 0.2 - tm * 0.75) * 9;

          const x = cx + (inx - 0.5) * spanX * scale;
          const y = rowY - wave * scale;

          if (y < -24 || y > h + 24) continue;

          const radius = (0.85 + persp * 2.0) * scale + 0.3;
          const depthA = 0.32 + persp * 0.6;
          const hueT = Math.min(
            1,
            Math.max(0, inx * 0.7 + (wave + 47) / 140),
          );

          ctx.beginPath();
          ctx.fillStyle = tint(hueT, depthA);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    let raf = 0;
    if (reduce) {
      frame(0);
    } else {
      const loop = (t: number) => {
        frame(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="absolute inset-0 h-full w-full"
    />
  );
}
