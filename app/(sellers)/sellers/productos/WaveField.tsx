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
  const mx = useRef(-9999); // ratón en px del canvas (objetivo)
  const my = useRef(-9999);
  const cmx = useRef(-9999); // ratón suavizado
  const cmy = useRef(-9999);

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

    // Densidad ajustada para fluidez. Tres tramos: phone (< 640) cae a
    // ~⅓ de los puntos del desktop para evitar jank en GPUs lentas.
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const phone = vw < 640;
    const small = vw < 900;
    const COLS = phone ? 24 : small ? 48 : 64;
    const ROWS = phone ? 16 : small ? 32 : 42;

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
      const r = canvas.getBoundingClientRect();
      mx.current = e.clientX - r.left;
      my.current = e.clientY - r.top;
    }
    function onLeave() {
      mx.current = -9999;
      my.current = -9999;
    }
    if (!reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      canvas.addEventListener("pointerleave", onLeave, { passive: true });
    }

    // Orbes bokeh deterministas
    let s = 1337;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const orbs = Array.from({ length: phone ? 3 : 7 }, () => ({
      x: rnd(),
      y: rnd(),
      r: 90 + rnd() * 170,
      sx: (rnd() - 0.5) * 0.012,
      sy: (rnd() - 0.5) * 0.012,
      hue: rnd(),
    }));

    // Paleta: turquesa → cian → índigo → violeta. Brillo b (0..1 → blanco).
    const PAL = [
      [45, 212, 191],
      [34, 211, 238],
      [99, 102, 241],
      [168, 85, 247],
    ];
    function tint(t: number, a: number, b: number): string {
      t = ((t % 1) + 1) % 1; // envoltura suave
      const seg = t * 3;
      const i = Math.min(2, Math.floor(seg));
      const k = seg - i;
      const c0 = PAL[i];
      const c1 = PAL[i + 1];
      let r = c0[0] + (c1[0] - c0[0]) * k;
      let g = c0[1] + (c1[1] - c0[1]) * k;
      let bl = c0[2] + (c1[2] - c0[2]) * k;
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

      // suavizado del ratón (para la perturbación local)
      if (mx.current < -9000) {
        cmx.current = mx.current;
        cmy.current = my.current;
      } else {
        if (cmx.current < -9000) {
          cmx.current = mx.current;
          cmy.current = my.current;
        }
        cmx.current += (mx.current - cmx.current) * 0.18;
        cmy.current += (my.current - cmy.current) * 0.18;
      }
      const hasMouse = cmx.current > -9000;
      const MR = 150; // radio de influencia
      const MR2 = MR * MR;

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
      const cx = w / 2;
      const horizon = -h * 0.06;
      const spanX = w * 1.78;
      const hueDrift = tm * 0.025 + Math.sin(tm * 0.09) * 0.04;

      let prevX: number[] = [];
      let prevY: number[] = [];

      for (let j = 0; j < ROWS; j++) {
        const jn = j / (ROWS - 1);
        const persp = Math.pow(jn, 1.26);
        const scale = 0.42 + persp * 0.98;
        const rowY = horizon + persp * (h * 1.12);
        // parallax por profundidad (las filas cercanas se mueven más)
        const pxo = offX * (0.3 + persp * 1.1);
        const pyo = offY * (0.3 + persp * 1.0);

        const curX: number[] = [];
        const curY: number[] = [];

        for (let i = 0; i < COLS; i++) {
          const inx = i / (COLS - 1);

          // domain-warp: terreno más orgánico
          const di = i + Math.sin(j * 0.3 + tm * 0.4) * 1.5;
          const dj = j + Math.sin(i * 0.25 - tm * 0.35) * 1.2;

          const wave =
            Math.sin(di * 0.32 + tm * 1.2 + j * 0.15) * 22 +
            Math.sin(dj * 0.4 + tm * 0.95) * 16 +
            Math.sin((di + dj) * 0.2 - tm * 0.75) * 9 +
            Math.sin(i * 0.05 + j * 0.04 + tm * 0.5) * 11; // oleaje lento

          const x = cx + (inx - 0.5) * spanX * scale + pxo;
          const y = rowY - wave * scale + pyo;

          // perturbación local: el cursor empuja y aviva las esferas
          let px2 = x;
          let py2 = y;
          let mInf = 0;
          if (hasMouse) {
            const ddx = x - cmx.current;
            const ddy = y - cmy.current;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 < MR2) {
              const d = Math.sqrt(d2) || 1;
              const t = 1 - d / MR;
              mInf = t * t;
              const push = mInf * 26;
              px2 = x + (ddx / d) * push;
              py2 = y + (ddy / d) * push;
            }
          }
          curX.push(px2);
          curY.push(py2);

          if (py2 < -28 || py2 > h + 28) continue;

          const crest = Math.max(0, wave / 58); // 0..~1
          const radius = ((0.85 + persp * 2.0) * scale + 0.3) * (1 + mInf * 0.8);
          const depthA = 0.3 + persp * 0.62;
          const hueT = inx * 0.5 + (wave + 58) / 170 + hueDrift;
          const bright = crest * 0.55 + mInf * 0.5;

          // glow suave en puntos cercanos / crestas
          if (persp > 0.4 || mInf > 0) {
            ctx.beginPath();
            ctx.fillStyle = tint(
              hueT,
              depthA * (0.12 + crest * 0.16) + mInf * 0.22,
              bright,
            );
            ctx.arc(px2, py2, radius * (2.4 + crest * 1.4), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.beginPath();
          ctx.fillStyle = tint(hueT, Math.min(1, depthA + crest * 0.3 + mInf * 0.4), bright);
          ctx.arc(px2, py2, radius, 0, Math.PI * 2);
          ctx.fill();

          // destello ocasional en crestas cercanas
          if (persp > 0.5 && crest > 0.5) {
            const tw = Math.sin(tm * 3.2 + i * 1.7 + j * 2.3);
            if (tw > 0.86) {
              ctx.globalCompositeOperation = "lighter";
              ctx.beginPath();
              ctx.fillStyle = `rgba(255,255,255,${(tw - 0.86) * 2.4})`;
              ctx.arc(px2, py2, radius * 1.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalCompositeOperation = "source-over";
            }
          }
        }

        // líneas de relieve entre filas cercanas
        if (persp > 0.34 && prevX.length === COLS) {
          ctx.beginPath();
          for (let i = 0; i < COLS; i++) {
            ctx.moveTo(prevX[i], prevY[i]);
            ctx.lineTo(curX[i], curY[i]);
          }
          ctx.strokeStyle = `rgba(130,170,255,${0.035 + persp * 0.07})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        prevX = curX;
        prevY = curY;
      }

      // ── Fundidos de borde (el campo emerge de la oscuridad) ──
      const topF = ctx.createLinearGradient(0, 0, 0, h * 0.34);
      topF.addColorStop(0, "rgba(5,6,16,0.92)");
      topF.addColorStop(1, "rgba(5,6,16,0)");
      ctx.fillStyle = topF;
      ctx.fillRect(0, 0, w, h * 0.34);

      const botF = ctx.createLinearGradient(0, h * 0.88, 0, h);
      botF.addColorStop(0, "rgba(4,5,14,0)");
      botF.addColorStop(1, "rgba(4,5,14,0.55)");
      ctx.fillStyle = botF;
      ctx.fillRect(0, h * 0.88, w, h * 0.12);

      const sideF = ctx.createLinearGradient(0, 0, w, 0);
      sideF.addColorStop(0, "rgba(4,5,14,0.5)");
      sideF.addColorStop(0.12, "rgba(4,5,14,0)");
      sideF.addColorStop(0.88, "rgba(4,5,14,0)");
      sideF.addColorStop(1, "rgba(4,5,14,0.5)");
      ctx.fillStyle = sideF;
      ctx.fillRect(0, 0, w, h);
    }

    let raf = 0;
    if (reduce) {
      frame(0);
    } else {
      // Throttle a ~36fps: suficiente para que se vea fluido y ~40% menos
      // CPU/GPU que a 60fps. Se pausa si la pestaña no está visible.
      const FRAME_MS = 1000 / 36;
      let last = 0;
      const loop = (t: number) => {
        raf = requestAnimationFrame(loop);
        if (document.hidden) return;
        if (t - last < FRAME_MS) return;
        last = t;
        frame(t);
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />;
}
