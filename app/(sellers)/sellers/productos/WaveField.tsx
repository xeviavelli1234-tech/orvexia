"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo animado premium: rejilla de partículas en perspectiva que ondula
 * (estilo "data terrain") con crestas iluminadas, líneas de relieve, glow,
 * orbes bokeh a la deriva, barrido de luz tipo aurora, velos de color
 * animados y parallax con el ratón. Canvas + rAF. Respeta reduced-motion.
 */
export default function WaveField() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const px = useRef(0); // parallax objetivo X (-1..1)
  const py = useRef(0);
  const cxr = useRef(0); // parallax suavizado
  const cyr = useRef(0);

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

    const COLS = 78;
    const ROWS = 52;

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

    function onMove(e: PointerEvent) {
      px.current = (e.clientX / window.innerWidth) * 2 - 1;
      py.current = (e.clientY / window.innerHeight) * 2 - 1;
    }
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true });

    // Orbes bokeh deterministas
    let s = 1337;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const orbs = Array.from({ length: 7 }, () => ({
      x: rnd(),
      y: rnd(),
      r: 90 + rnd() * 170,
      sx: (rnd() - 0.5) * 0.012,
      sy: (rnd() - 0.5) * 0.012,
      hue: rnd(),
    }));

    // cian → azul → violeta, con brillo b (0..1 hacia blanco)
    function tint(t: number, a: number, b: number): string {
      let r: number, g: number, bl: number;
      if (t < 0.5) {
        const k = t / 0.5;
        r = 34 + k * 65;
        g = 211 - k * 109;
        bl = 238 + k * 3;
      } else {
        const k = (t - 0.5) / 0.5;
        r = 99 + k * 69;
        g = 102 - k * 17;
        bl = 241 + k * 6;
      }
      r += (255 - r) * b;
      g += (255 - g) * b;
      bl += (255 - bl) * b;
      return `rgba(${r | 0},${g | 0},${bl | 0},${a})`;
    }

    function frame(time: number) {
      const tm = time * 0.001;
      ctx.clearRect(0, 0, w, h);

      // suavizado del parallax
      cxr.current += (px.current - cxr.current) * 0.04;
      cyr.current += (py.current - cyr.current) * 0.04;
      const offX = cxr.current * 26;
      const offY = cyr.current * 16;

      // ── Velos de color animados ──────────────────────────────
      const v1x = w * (0.3 + Math.sin(tm * 0.13) * 0.06) + offX;
      const v1y = h * (0.42 + Math.cos(tm * 0.11) * 0.05) + offY;
      const g1 = ctx.createRadialGradient(v1x, v1y, 0, v1x, v1y, Math.max(w, h) * 0.8);
      g1.addColorStop(0, "rgba(38,76,160,0.34)");
      g1.addColorStop(1, "rgba(8,10,30,0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, w, h);

      const v2x = w * (0.74 + Math.cos(tm * 0.1) * 0.06) + offX;
      const v2y = h * (0.64 + Math.sin(tm * 0.12) * 0.05) + offY;
      const g2 = ctx.createRadialGradient(v2x, v2y, 0, v2x, v2y, Math.max(w, h) * 0.72);
      g2.addColorStop(0, "rgba(110,46,168,0.28)");
      g2.addColorStop(1, "rgba(8,10,30,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, w, h);

      // ── Orbes bokeh a la deriva ──────────────────────────────
      ctx.globalCompositeOperation = "lighter";
      for (const o of orbs) {
        const ox = ((o.x + tm * o.sx) % 1.2) * w - w * 0.1 + offX * 1.6;
        const oy = ((o.y + tm * o.sy) % 1.2) * h - h * 0.1 + offY * 1.6;
        const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.r);
        og.addColorStop(0, tint(o.hue, 0.10, 0.15));
        og.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(ox, oy, o.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Barrido de luz tipo aurora ───────────────────────────
      const band = w * 0.42;
      const sweepX = ((tm * 90) % (w + band * 2)) - band;
      const sg = ctx.createLinearGradient(sweepX - band, 0, sweepX + band, 0);
      sg.addColorStop(0, "rgba(120,180,255,0)");
      sg.addColorStop(0.5, "rgba(120,180,255,0.06)");
      sg.addColorStop(1, "rgba(120,180,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      // ── Rejilla de partículas ────────────────────────────────
      const cx = w / 2 + offX;
      const horizon = -h * 0.06 + offY;
      const spanX = w * 1.78;

      let prevX: number[] = [];
      let prevY: number[] = [];

      for (let j = 0; j < ROWS; j++) {
        const jn = j / (ROWS - 1);
        const persp = Math.pow(jn, 1.26);
        const scale = 0.42 + persp * 0.98;
        const rowY = horizon + persp * (h * 1.12);

        const curX: number[] = [];
        const curY: number[] = [];

        for (let i = 0; i < COLS; i++) {
          const inx = i / (COLS - 1);

          const wave =
            Math.sin(i * 0.32 + tm * 1.2 + j * 0.15) * 22 +
            Math.sin(j * 0.4 + tm * 0.95) * 16 +
            Math.sin((i + j) * 0.2 - tm * 0.75) * 9;

          const x = cx + (inx - 0.5) * spanX * scale;
          const y = rowY - wave * scale;
          curX.push(x);
          curY.push(y);

          if (y < -28 || y > h + 28) continue;

          // cresta: cuanto más alto el punto en su entorno, más brillante
          const crest = Math.max(0, wave / 47); // 0..~1
          const radius = (0.85 + persp * 2.0) * scale + 0.3;
          const depthA = 0.3 + persp * 0.62;
          const hueT = Math.min(1, Math.max(0, inx * 0.7 + (wave + 47) / 140));
          const bright = crest * 0.55;

          // glow suave en puntos cercanos / crestas
          if (persp > 0.4) {
            ctx.beginPath();
            ctx.fillStyle = tint(hueT, depthA * (0.12 + crest * 0.16), bright);
            ctx.arc(x, y, radius * (2.4 + crest * 1.4), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.beginPath();
          ctx.fillStyle = tint(hueT, Math.min(1, depthA + crest * 0.3), bright);
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        // líneas de relieve entre filas cercanas
        if (persp > 0.34 && prevX.length === COLS) {
          ctx.beginPath();
          for (let i = 0; i < COLS; i++) {
            ctx.moveTo(prevX[i], prevY[i]);
            ctx.lineTo(curX[i], curY[i]);
          }
          ctx.strokeStyle = `rgba(120,160,255,${0.04 + persp * 0.07})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        prevX = curX;
        prevY = curY;
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
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
