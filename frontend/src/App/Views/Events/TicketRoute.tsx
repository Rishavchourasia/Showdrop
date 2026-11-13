import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../../Components/CustomHooks/useMediaQuery';
import { FlipText, Icon, type IconName, Text } from '../../Components/CustomUI';
import { cx } from '../../Utils/cx';
import styles from './TicketRoute.module.scss';

/*
 * THE TICKET'S JOURNEY. A dotted route curves down the page past four steps.
 * As you scroll, a glowing line draws along it and a little ticket rides the
 * tip of the line; each step lights up the moment the ticket reaches it.
 *
 * HOW:
 *  - scroll progress (0 -> 1) through this section = how much of the path is drawn
 *  - the path's real <path> element tells us the point at any length
 *    (getPointAtLength), which is where we put the ticket
 *  - a step is "reached" once progress passes its position along the route
 */
interface Step {
  title: string;
  text: string;
  icon: IconName;
}

const STEPS: Step[] = [
  { title: 'Pick a show', text: 'Movies, stand-up, theatre and concerts. Filter by mood, choose a day.', icon: 'film' },
  {
    title: 'Tap your seats',
    text: 'A live map shows what is free right now. Held and booked seats are locked.',
    icon: 'ticket',
  },
  {
    title: 'Hold for 5 minutes',
    text: 'Seats are reserved just for you while you pay. Nobody can snatch them.',
    icon: 'clock',
  },
  {
    title: 'Walk right in',
    text: 'Your ticket lands in your wallet. Press and hold the code at the door.',
    icon: 'zap',
  },
];

// Where each step's dot sits, in a 1000 x 1000 box (desktop zig-zags, phone runs down the left).
const DESKTOP = [
  { x: 300, y: 110 },
  { x: 700, y: 370 },
  { x: 300, y: 630 },
  { x: 700, y: 890 },
];
const PHONE = DESKTOP.map((p) => ({ x: 70, y: p.y }));

/** A smooth S-curve through the dots (each segment is a cubic Bézier with vertical handles). */
function routeThrough(points: { x: number; y: number }[]): string {
  let d = `M ${points[0].x} 0 L ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const mid = (a.y + b.y) / 2;
    d += ` C ${a.x} ${mid}, ${b.x} ${mid}, ${b.x} ${b.y}`;
  }
  return d + ` L ${points[points.length - 1].x} 1000`;
}

export function TicketRoute() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const phone = useMediaQuery('(max-width: 720px)');
  const dots = phone ? PHONE : DESKTOP;
  const d = routeThrough(dots);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start 65%', 'end 75%'] });
  const drawn = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });

  // The ticket's position, in % of the box, and its heading along the curve.
  const tx = useMotionValue(dots[0].x / 10);
  const ty = useMotionValue(0);
  const turn = useMotionValue(0);
  const left = useTransform(tx, (v) => `${v}%`);
  const top = useTransform(ty, (v) => `${v}%`);
  // Each dot's position along the route (0..1). Kept in a ref so the scroll handler
  // always reads the latest values, not the ones from when it was first created.
  const stopsRef = useRef<number[]>([]);
  const [reached, setReached] = useState(0);

  // Measure where each dot falls along the route (once the path is in the DOM).
  useLayoutEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    const found = dots.map((dot) => {
      let best = 0;
      let bestDist = Infinity;
      for (let l = 0; l <= total; l += total / 400) {
        const pt = path.getPointAtLength(l);
        const dist = Math.hypot(pt.x - dot.x, pt.y - dot.y);
        if (dist < bestDist) {
          bestDist = dist;
          best = l / total;
        }
      }
      return best;
    });
    stopsRef.current = found;
  }, [d, dots]);

  useMotionValueEvent(drawn, 'change', (v) => {
    const path = pathRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    const at = Math.min(1, Math.max(0, v)) * total;
    const pt = path.getPointAtLength(at);
    const ahead = path.getPointAtLength(Math.min(total, at + 4));
    tx.set(pt.x / 10);
    ty.set(pt.y / 10);
    turn.set((Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180) / Math.PI - 90);
    const count = stopsRef.current.filter((s) => v >= s - 0.005).length;
    setReached((r) => (r === count ? r : count)); // re-render only when a new step is reached
  });

  return (
    <section className={styles.section} aria-label="How Showdrop works">
      <div className={styles.head}>
        <Text variant="overline" tone="highlight">
          How it works
        </Text>
        <FlipText
          className={styles.heading}
          parts={[{ text: 'From couch' }, { text: 'to front row.', accent: true }]}
        />
      </div>

      <div ref={sectionRef} className={styles.track}>
        <svg className={styles.svg} viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          <path d={d} className={styles.dotted} vectorEffect="non-scaling-stroke" />
          {/* No non-scaling-stroke here: it would make the browser measure the "drawn"
              length in screen pixels, so the line would stop short of the ticket. */}
          <motion.path ref={pathRef} d={d} className={styles.glow} style={{ pathLength: drawn }} />
        </svg>

        {/* the little traveller */}
        <motion.div className={styles.traveller} style={{ left, top, rotate: turn }} aria-hidden="true">
          <Icon name="ticket" size={20} />
        </motion.div>

        {STEPS.map((step, i) => {
          const lit = i < reached;
          const dot = dots[i];
          return (
            <div
              key={step.title}
              className={cx(styles.step, lit && styles.lit, !phone && dot.x > 500 ? styles.toLeft : styles.toRight)}
              style={{ left: `${dot.x / 10}%`, top: `${dot.y / 10}%` }}
            >
              <span className={styles.node}>
                <Icon name={step.icon} size={18} />
              </span>
              <motion.div
                className={styles.card}
                animate={{ opacity: lit ? 1 : 0.35, y: lit ? 0 : 14, scale: lit ? 1 : 0.97 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              >
                <span className={styles.stepNo}>0{i + 1}</span>
                <Text variant="h2">{step.title}</Text>
                <Text tone="secondary">{step.text}</Text>
              </motion.div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
