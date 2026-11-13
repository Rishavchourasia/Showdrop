import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../Utils/motion';

/*
 * A circular equalizer: 120 bars standing out from a ring, dancing to a fake
 * beat (a few sine waves + a kick every ~0.6s). Bars on the side nearest your
 * cursor jump higher, so the ring "listens" to you. Colours sweep from
 * ultraviolet through pink to acid lime around the circle.
 *
 * Drawn on a <canvas>; pauses when off screen; one still frame with reduced motion.
 */
const BARS = 120;

export function SoundRing({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const still = prefersReducedMotion();
    let w = 0;
    let h = 0;
    const fit = () => {
      const b = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio, 2);
      w = b.width;
      h = b.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener('resize', fit);

    let cursorAngle: number | null = null;
    const onMove = (e: PointerEvent) => {
      const b = canvas.getBoundingClientRect();
      cursorAngle = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2));
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let onScreen = true;
    const io = new IntersectionObserver(([e]) => (onScreen = e?.isIntersecting ?? true));
    io.observe(canvas);

    const levels = new Float32Array(BARS); // smoothed bar heights
    let raf = 0;
    const frame = (ms: number) => {
      if (!still) raf = requestAnimationFrame(frame);
      if (!onScreen && !still) return;
      const t = ms / 1000;
      const cx = w / 2;
      const cy = h / 2;
      const inner = Math.min(w, h) * 0.3;
      const kick = Math.max(0, 1 - ((t % 0.6) / 0.6) * 3); // sharp hit, quick decay
      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, (Math.PI * 2 * inner) / BARS - 2.5);

      for (let i = 0; i < BARS; i++) {
        const a = (i / BARS) * Math.PI * 2 - Math.PI / 2;
        let target =
          0.25 +
          0.25 * Math.sin(t * 3.1 + i * 0.35) ** 2 +
          0.2 * Math.sin(t * 1.7 - i * 0.12) ** 2 +
          0.35 * kick * Math.abs(Math.sin(i * 0.9));
        if (cursorAngle !== null) {
          const d = Math.abs(Math.atan2(Math.sin(a - cursorAngle), Math.cos(a - cursorAngle)));
          target += Math.max(0, 1 - d / 0.7) * 0.6; // boost the bars facing the cursor
        }
        levels[i] += (target - levels[i]) * 0.25;
        const len = inner * 0.45 * levels[i];
        const hue = 260 + 120 * Math.sin((i / BARS) * Math.PI); // uv -> pink -> lime-ish
        ctx.strokeStyle = `hsl(${hue % 360} 95% ${60 + levels[i] * 15}% / ${0.55 + levels[i] * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
        ctx.lineTo(cx + Math.cos(a) * (inner + len), cy + Math.sin(a) * (inner + len));
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', fit);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
