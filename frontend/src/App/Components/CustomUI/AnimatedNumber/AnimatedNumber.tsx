import { animate, useMotionValue, useTransform, motion } from 'motion/react';
import { useEffect } from 'react';

/*
 * A number that counts up/down smoothly when it changes (e.g. the total price as
 * you add seats). `format` turns the in-between values into text: fmt.money etc.
 */
export function AnimatedNumber({
  value,
  format = (n) => String(Math.round(n)),
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (n) => format(n));

  useEffect(() => {
    const controls = animate(mv, value, { type: 'spring', stiffness: 140, damping: 22 });
    return () => controls.stop();
  }, [mv, value]);

  return <motion.span className={className}>{text}</motion.span>;
}
