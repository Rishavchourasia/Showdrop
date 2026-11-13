import { motion, useMotionTemplate, useMotionValue, useSpring } from 'motion/react';
import type { PointerEvent } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink, FlapNumber, Icon, SparkBurst, Text } from '../../Components/CustomUI';
import { Spotlights } from '../../Components/Stage/Spotlights';
import { useIntroDone } from '../../Components/Intro/IntroContext';
import { PosterArt } from '../../Components/PosterArt/PosterArt';
import { eventPath, ROUTE_MUSIC } from '../../Constants/RouteConstants';
import type { EventSummary } from '../../Models/Event';
import { EASE_OUT } from '../../Utils/motion';
import styles from './Events.module.scss';

/*
 * The landing hero.
 *  - an "aurora" glow that follows the cursor (a spring-smoothed radial gradient)
 *  - a kinetic headline: each word slides up from behind a mask, one after another
 *  - a fanned stack of featured posters that spreads out on hover
 *  - two stage spotlights that swing to follow the cursor
 *  - buttons that burst into sparks when clicked, and split-flap board stats
 * Every entrance waits for the intro curtain (useIntroDone) so you actually see it.
 */
const WORDS = ['Your', 'night', 'out,', 'one', 'tap', 'away.'];
const MotionLink = motion.create(Link);

export function Hero({ featured }: { featured: EventSummary[] }) {
  const introDone = useIntroDone();
  // Entrance helper: rise into place once the curtain has lifted.
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: introDone ? { opacity: 1, y: 0 } : undefined,
    transition: { duration: 0.9, ease: EASE_OUT, delay },
  });
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
      <Spotlights />

      <div className={styles.heroCopy}>
        <motion.div className={styles.eyebrow} {...rise(0.05)}>
          <span className={styles.liveDot} /> Live in Mumbai · Bengaluru · Delhi
        </motion.div>

        <Text variant="hero" className={styles.headline}>
          {WORDS.map((w, i) => (
            <span key={i} className={styles.wordMask}>
              <motion.span
                className={i >= 3 ? styles.wordAccent : undefined}
                initial={{ y: '110%', skewY: 8 }}
                animate={introDone ? { y: '0%', skewY: 0 } : undefined}
                transition={{ type: 'spring', stiffness: 130, damping: 17, delay: 0.1 + i * 0.07 }}
              >
                {w}
              </motion.span>
            </span>
          ))}
        </Text>

        <motion.div {...rise(0.55)}>
          <Text tone="secondary" className={styles.lede}>
            Movies, stand-up, theatre, and soon live music. Pick your seats on a live map, hold them for five minutes,
            pay with zero booking fees.
          </Text>
        </motion.div>

        <motion.div className={styles.heroCtas} {...rise(0.65)}>
          {top && (
            <SparkBurst>
              <ButtonLink to={eventPath(top.id)} variant="go" size="lg" shape="pill">
                Book {top.title} <Icon name="arrowRight" size={18} />
              </ButtonLink>
            </SparkBurst>
          )}
          <SparkBurst>
            <ButtonLink to={ROUTE_MUSIC} variant="secondary" size="lg" shape="pill">
              <Icon name="music" size={18} /> Music is coming
            </ButtonLink>
          </SparkBurst>
        </motion.div>

        <motion.dl className={styles.stats} {...rise(0.8)}>
          <div>
            <dt>Shows this week</dt>
            <dd>
              <FlapNumber value={`${Math.max(featured.length * 3, 12)}+`} />
            </dd>
          </div>
          <div>
            <dt>Booking fees</dt>
            <dd>
              <FlapNumber value="0" />
            </dd>
          </div>
          <div>
            <dt>Minute seat hold</dt>
            <dd>
              <FlapNumber value="5" />
            </dd>
          </div>
        </motion.dl>
      </div>

      <div className={styles.stack}>
        {featured.slice(0, 3).map((e, i) => (
          <MotionLink
            key={e.id}
            to={eventPath(e.id)}
            className={styles.stackCard}
            data-pos={i}
            // Dealt like cards: each one flips over from face-down as it lands.
            initial={{ opacity: 0, y: -120, rotateY: 180, rotate: 0 }}
            animate={introDone ? { opacity: 1, y: 0, rotateY: 0, rotate: [-8, 6, -2][i] } : undefined}
            transition={{ type: 'spring', stiffness: 90, damping: 15, delay: 0.3 + i * 0.15 }}
            aria-label={e.title}
          >
            <PosterArt title={e.title} category={e.category} seed={e.id} size="hero" />
          </MotionLink>
        ))}
      </div>
    </section>
  );
}
