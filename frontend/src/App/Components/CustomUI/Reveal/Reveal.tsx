import { motion, type Variants } from 'motion/react';
import type { ReactNode } from 'react';

/*
 * Fade-and-rise into view when scrolled to (once). Wrap anything:
 *   <Reveal><Card>…</Card></Reveal>
 * RevealGroup + RevealItem stagger a list: each child appears a beat after the last.
 * The motion library automatically respects the OS "reduce motion" setting (see MotionConfig in App.tsx).
 */
const item: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(6px)' },
  shown: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { type: 'spring', stiffness: 120, damping: 20 } },
};

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={item}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function RevealGroup({
  children,
  className,
  stagger = 0.06,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: '-40px' }}
      variants={{ shown: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={item}>
      {children}
    </motion.div>
  );
}
