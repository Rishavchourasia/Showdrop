import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import type { PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink, Icon, Text } from '../../Components/CustomUI';
import { PosterArt } from '../../Components/PosterArt/PosterArt';
import { eventPath, ROUTE_MUSIC } from '../../Constants/RouteConstants';
import type { EventSummary } from '../../Models/Event';
import styles from './Events.module.scss';

/*
 * The landing hero.
 *  - an "aurora" glow that follows the cursor (a spring-smoothed radial gradient)
 *  - a kinetic headline: each word slides up from behind a mask, one after another
 *  - a fanned stack of featured posters that spreads out on hover
 */
const WORDS = ['Your', 'night', 'out,', 'one', 'tap', 'away.'];
const MotionLink = motion.create(Link);

export function Hero({ featured }: { featured: EventSummary[] }) {
  const mx = useMotionValue(70);
  const my = useMotionValue(30);
  const x = useSpring(mx, { stiffness: 60, damping: 20 });
  const y = useSpring(my, { stiffness: 60, damping: 20 });
  const aurora = useMotionTemplate`radial-gradient(520px 380px at ${x}% ${y}%, rgb(124 92 255 / 38%), transparent 70%)`;

  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width) * 100);
    my.set(((e.clientY - r.top) / r.height) * 100);
  };

  const top = featured[0];

  return (
    <section className={styles.hero} onPointerMove={onMove}>
      <motion.div className={styles.aurora} style={{ background: aurora }} aria-hidden="true" />
      <div className={styles.heroGrid} aria-hidden="true" />

      <div className={styles.heroCopy}>
        <motion.div
          className={styles.eyebrow}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className={styles.liveDot} /> Live in Mumbai · Bengaluru · Delhi
        </motion.div>

        <Text variant="hero" className={styles.headline}>
          {WORDS.map((w, i) => (
            <span key={i} className={styles.wordMask}>
              <motion.span
                className={i >= 3 ? styles.wordAccent : undefined}
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 120, damping: 18 }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </Text>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <Text tone="secondary" className={styles.lede}>
            Movies, stand-up, theatre, and soon live music. Pick your seats on a live map, hold them for five minutes,
            pay with zero booking fees.
          </Text>
        </motion.div>

        <motion.div
          className={styles.heroCtas}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          {top && (
            <ButtonLink to={eventPath(top.id)} variant="go" size="lg" shape="pill">
              Book {top.title} <Icon name="arrowRight" size={18} />
            </ButtonLink>
          )}
          <ButtonLink to={ROUTE_MUSIC} variant="secondary" size="lg" shape="pill">
            <Icon name="music" size={18} /> Music is coming
          </ButtonLink>
        </motion.div>
      </div>

      <div className={styles.stack}>
        {featured.slice(0, 3).map((e, i) => (
          <MotionLink
            key={e.id}
            to={eventPath(e.id)}
            className={styles.stackCard}
            data-pos={i}
            initial={{ opacity: 0, y: 60, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: [-8, 6, -2][i] }}
            transition={{ delay: 0.35 + i * 0.12, type: 'spring', stiffness: 90, damping: 16 }}
            aria-label={e.title}
          >
            <PosterArt title={e.title} category={e.category} seed={e.id} size="hero" />
          </MotionLink>
        ))}
      </div>
    </section>
  );
}
