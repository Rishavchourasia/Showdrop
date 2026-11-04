import type { CSSProperties } from 'react';
import { cx } from '../../Utils/cx';
import { type PosterCategory, toPosterCategory } from '../../Utils/poster';
import { seededRandom } from '../../Utils/random';
import styles from './PosterArt.module.scss';

/*
 * Generated poster artwork: no stock photos, every event gets a consistent,
 * on-brand poster. The category picks the colour palette and a motif (film
 * rings, sound bars, a spotlight...), and the event id seeds small variations
 * (angle, blob positions) so two movies never look identical.
 */
interface PosterArtProps {
  title: string;
  category: string;
  seed: number;
  size?: 'thumb' | 'card' | 'hero';
  showTitle?: boolean;
  className?: string;
}

export function PosterArt({ title, category, seed, size = 'card', showTitle = true, className }: PosterArtProps) {
  const cat = toPosterCategory(category);
  const r = seededRandom(seed + cat.length * 17);
  const style = {
    '--angle': `${Math.round(120 + r() * 120)}deg`,
    '--blob1-x': `${Math.round(10 + r() * 60)}%`,
    '--blob1-y': `${Math.round(5 + r() * 40)}%`,
    '--blob2-x': `${Math.round(40 + r() * 50)}%`,
    '--blob2-y': `${Math.round(40 + r() * 50)}%`,
    // Music has no backend categories yet, so vary its hue per item to keep the line-up colourful.
    '--hue': cat === 'music' ? `${Math.round(r() * 300) - 150}deg` : '0deg',
  } as CSSProperties;

  return (
    <div className={cx(styles.poster, styles[cat], styles[size], className)} style={style}>
      <span className={styles.blob1} />
      <span className={styles.blob2} />
      <Motif cat={cat} />
      {showTitle && (
        <div className={styles.titleBlock}>
          <span className={styles.kicker}>{category}</span>
          <span className={styles.title}>{title}</span>
        </div>
      )}
    </div>
  );
}

function Motif({ cat }: { cat: PosterCategory }) {
  switch (cat) {
    case 'movie': // concentric "projector" rings + film perforations
      return (
        <svg className={styles.motif} viewBox="0 0 200 300" aria-hidden="true">
          {[90, 70, 50, 30].map((rad) => (
            <circle key={rad} cx="100" cy="110" r={rad} fill="none" stroke="currentColor" strokeWidth="1.2" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x="8" y={14 + i * 28} width="8" height="14" rx="2" fill="currentColor" />
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={`r${i}`} x="184" y={14 + i * 28} width="8" height="14" rx="2" fill="currentColor" />
          ))}
        </svg>
      );
    case 'concert':
    case 'music': // sound-wave bars that pulse
      return (
        <svg className={styles.motif} viewBox="0 0 200 300" aria-hidden="true">
          {Array.from({ length: 16 }, (_, i) => {
            const h = 30 + Math.abs(Math.sin(i * 1.3)) * 110;
            return (
              <rect
                key={i}
                className={styles.bar}
                style={{ animationDelay: `${i * 70}ms` }}
                x={14 + i * 11.5}
                y={130 - h / 2}
                width="6"
                height={h}
                rx="3"
                fill="currentColor"
              />
            );
          })}
        </svg>
      );
    case 'comedy': // halftone dot grid
      return (
        <svg className={styles.motif} viewBox="0 0 200 300" aria-hidden="true">
          {Array.from({ length: 12 * 14 }, (_, i) => {
            const x = (i % 12) * 17 + 8;
            const y = Math.floor(i / 12) * 17 + 8;
            const d = Math.hypot(x - 150, y - 60);
            return <circle key={i} cx={x} cy={y} r={Math.max(0.6, 6 - d / 30)} fill="currentColor" />;
          })}
        </svg>
      );
    case 'theatre': // a spotlight cone + stage line
      return (
        <svg className={styles.motif} viewBox="0 0 200 300" aria-hidden="true">
          <path d="M100 0 L30 210 L170 210 Z" fill="currentColor" opacity="0.35" />
          <ellipse cx="100" cy="210" rx="70" ry="12" fill="currentColor" opacity="0.6" />
          <line x1="0" y1="232" x2="200" y2="232" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      );
  }
}
