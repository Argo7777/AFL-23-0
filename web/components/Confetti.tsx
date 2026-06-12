"use client";

import { useEffect, useRef } from "react";

/** Hand-rolled premiership confetti — no libraries, fires once on mount. */
export default function Confetti({ big }: { big?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const W = (canvas.width = window.innerWidth);
    const H = (canvas.height = Math.min(window.innerHeight, 900));
    const colors = ["#fbbf24", "#a3e635", "#e2e8f0", "#38bdf8", "#f472b6"];
    const N = big ? 220 : 130;
    const pieces = Array.from({ length: N }, () => ({
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.5,
      w: 6 + Math.random() * 7,
      h: 8 + Math.random() * 10,
      vy: 2 + Math.random() * 3.5,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.12 + Math.random() * 0.24,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      ctx.clearRect(0, 0, W, H);
      for (const p of pieces) {
        p.x += p.vx + Math.sin((frame + p.y) / 25);
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = Math.max(0, 1 - frame / 260);
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (frame < 280) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [big]);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
      aria-hidden
    />
  );
}
