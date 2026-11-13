import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef, type ReactNode } from 'react';
import { Text } from '../../Components/CustomUI';
import { prefersReducedMotion } from '../../Utils/motion';
import styles from './CurtainStage.module.scss';

/*
 * CURTAIN UP. A full-screen theatre stage that plays out as you scroll:
 *
 *   0.00 - 0.15  a "NOW SHOWING" marquee sign with chasing bulbs fades away
 *   0.05 - 0.50  the velvet curtains draw apart (gathering into folds as they go)
 *   0.30 - 0.85  posters rise out of the stage floor one by one, under a sweeping spotlight
 *   0.75 - 1.00  the caption arrives
 *
 * The section is ~2.6 screens tall; its content is `position: sticky`, so the
 * stage stays put while scroll PROGRESS drives everything. Scrolling back up
 * plays it in reverse. With "reduce motion" the curtains are simply open.
 */
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const between = (v: number, a: number, b: number) => clamp01((v - a) / (b - a));

function Poster({ node, index, count, p }: { node: ReactNode; index: number; count: number; p: MotionValue<number> }) {
  // Each poster gets its own slice of the 0.30 - 0.85 window, so they rise one after another.
  const start = 0.3 + (index / count) * 0.4;
  const rise = useTransform(p, (v) => between(v, start, start + 0.15));
  const y = useTransform(rise, [0, 1], ['115%', '0%']);
  const rotate = useTransform(rise, [0, 1], [index % 2 ? 9 : -9, index % 2 ? 2 : -2]);
  return (
    <motion.div className={styles.poster} style={{ y, rotate }}>
      {node}
    </motion.div>
  );
}

export function CurtainStage({ posters, caption }: { posters: ReactNode[]; caption: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const still = prefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const p = useTransform(scrollYProgress, (v) => (still ? 1 : v));

  const open = useTransform(p, (v) => between(v, 0.05, 0.5));
  const leftX = useTransform(open, [0, 1], ['0%', '-92%']);
  const rightX = useTransform(open, [0, 1], ['0%', '92%']);
  const gather = useTransform(open, [0, 1], [1, 0.55]); // folds bunch up as the curtain opens
  const signOpacity = useTransform(p, (v) => 1 - between(v, 0.02, 0.15));
  const signScale = useTransform(p, (v) => 1 + between(v, 0.02, 0.15) * 0.15);
  const sweep = useTransform(p, (v) => -35 + v * 70); // the spotlight sweeps across the stage
  const captionOpacity = useTransform(p, (v) => between(v, 0.75, 0.9));
  const captionY = useTransform(captionOpacity, [0, 1], [30, 0]);

  return (
    <section ref={ref} className={still ? styles.sectionStill : styles.section} aria-label="Now showing">
      <div className={styles.stage}>
        {/* behind the curtain: back wall, floor, spotlight, posters */}
        <div className={styles.backWall} aria-hidden="true" />
        <motion.div className={styles.sweep} style={{ rotate: sweep }} aria-hidden="true" />
        <div className={styles.floor} aria-hidden="true" />
        <div className={styles.lineup}>
          {posters.map((node, i) => (
            <Poster key={i} node={node} index={i} count={posters.length} p={p} />
          ))}
        </div>

        <motion.div className={styles.caption} style={{ opacity: captionOpacity, y: captionY }}>
          {caption}
        </motion.div>

        {/* the curtains */}
        <motion.div
          className={`${styles.curtain} ${styles.left}`}
          style={{ x: leftX, scaleX: gather }}
          aria-hidden="true"
        />
        <motion.div
          className={`${styles.curtain} ${styles.right}`}
          style={{ x: rightX, scaleX: gather }}
          aria-hidden="true"
        />
        <div className={styles.valance} aria-hidden="true" />

        {/* the marquee sign on the closed curtain */}
        <motion.div className={styles.sign} style={{ opacity: signOpacity, scale: signScale }} aria-hidden="true">
          {(['edgeTop', 'edgeRight', 'edgeBottom', 'edgeLeft'] as const).map((edge, e) => (
            <span key={edge} className={`${styles.bulbs} ${styles[edge]}`}>
              {Array.from({ length: edge === 'edgeTop' || edge === 'edgeBottom' ? 12 : 4 }, (_, i) => (
                // Neighbouring bulbs are out of step, so the light seems to chase round the sign.
                <i key={i} style={{ animationDelay: `${((i + e * 3) % 4) * 0.15}s` }} />
              ))}
            </span>
          ))}
          <Text variant="overline" tone="highlight">
            Tonight
          </Text>
          <span className={styles.signTitle}>Now showing</span>
          {!still && <span className={styles.hint}>Scroll to raise the curtain</span>}
        </motion.div>
      </div>
    </section>
  );
}
