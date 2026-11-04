import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { PointerEvent, ReactNode } from 'react';
import { cx } from '../../../Utils/cx';
import styles from './TiltCard.module.scss';

/*
 * A card that tilts in 3D toward the pointer, with a holographic light streak
 * that follows it (the "shiny ticket" effect).
 *
 * HOW: the pointer position becomes two motion values (-0.5…0.5). Springs smooth
 * them, and useTransform maps them to rotateX/rotateY degrees and the shine
 * position. Nothing re-renders React on mouse move: motion values update the DOM directly.
 */
interface TiltCardProps {
  children: ReactNode;
  className?: string;
  /** Max tilt in degrees. */
  intensity?: number;
  shine?: boolean;
}

export function TiltCard({ children, className, intensity = 10, shine = true }: TiltCardProps) {
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [-0.5, 0.5], [-intensity, intensity]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [intensity, -intensity]);
  const shineX = useTransform(sx, [-0.5, 0.5], ['0%', '100%']);
  const shineY = useTransform(sy, [-0.5, 0.5], ['0%', '100%']);
  const background = useMotionTemplate`radial-gradient(circle at ${shineX} ${shineY}, rgb(255 255 255 / 22%), transparent 45%)`;

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return; // no tilt on touch: it fights with scrolling
    const r = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => {
    px.set(0);
    py.set(0);
  };

  return (
    <div className={styles.perspective}>
      <motion.div
        className={cx(styles.card, className)}
        style={{ rotateX, rotateY }}
        onPointerMove={onMove}
        onPointerLeave={reset}
      >
        {children}
        {shine && (
          <>
            <motion.span className={styles.glare} style={{ background }} aria-hidden="true" />
            <span className={styles.holo} aria-hidden="true" />
          </>
        )}
      </motion.div>
    </div>
  );
}
