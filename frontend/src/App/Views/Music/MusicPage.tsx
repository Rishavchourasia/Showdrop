import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDocumentTitle } from '../../Components/CustomHooks/useDocumentTitle';
import {
  Badge,
  Button,
  Card,
  Icon,
  Marquee,
  RevealGroup,
  RevealItem,
  Text,
  TextField,
  TiltCard,
} from '../../Components/CustomUI';
import { Equalizer, Vinyl } from '../../Components/MusicVisuals/MusicVisuals';
import { PosterArt } from '../../Components/PosterArt/PosterArt';
import { GENRES, MUSIC_FEATURES, PREVIEW_GIGS } from '../../Constants/musicPreview';
import { TOAST_SHOWN } from '../../Redux/Actions/ToastConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import { infoStore } from '../../Utils/InfoStore';
import styles from './Music.module.scss';

/*
 * MUSIC — COMING SOON. A frontend-only preview: no API calls.
 * The waitlist is stored in this browser (InfoStore) until the backend exists.
 */
export function MusicPage() {
  useDocumentTitle('Live music · Coming soon');
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [email, setEmail] = useState(user?.email ?? '');
  const [joined, setJoined] = useState<string | null>(() => infoStore.getWaitlistEmail());
  const [error, setError] = useState<string | null>(null);

  const join = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }
    infoStore.joinWaitlist(email);
    setJoined(email);
    dispatch({
      type: TOAST_SHOWN,
      payload: { id: crypto.randomUUID(), tone: 'success', message: "You're on the list! We'll ping you first." },
    });
  };

  return (
    <div className={styles.page}>
      {/* ---------- hero ---------- */}
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Badge tone="soon">Coming soon</Badge>
          </motion.div>
          <Text variant="hero">
            <motion.span
              className={styles.line}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 90 }}
            >
              Feel the
            </motion.span>
            <motion.span
              className={`${styles.line} ${styles.bass}`}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, type: 'spring', stiffness: 90 }}
            >
              bass drop.
            </motion.span>
          </Text>
          <Text tone="secondary" className={styles.lede}>
            Gigs, club nights and festivals are coming to Showdrop, with live venue maps, festival passes and zero
            booking fees. Get on the list for early access.
          </Text>

          <AnimatePresence mode="wait">
            {joined ? (
              <motion.div
                key="joined"
                className={styles.joined}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 16 }}
              >
                <span className={styles.joinedIcon}>
                  <Icon name="check" size={18} />
                </span>
                <div>
                  <Text variant="bodyStrong">You&apos;re on the list</Text>
                  <Text variant="small" tone="muted">
                    We&apos;ll email {joined} the moment tickets drop.
                  </Text>
                </div>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                className={styles.waitlist}
                onSubmit={join}
                exit={{ opacity: 0, y: -8 }}
                noValidate
              >
                <TextField
                  label="Email for early access"
                  hideLabel
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  error={error}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                />
                <Button type="submit" variant="go" shape="pill">
                  <Icon name="zap" size={16} /> Get early access
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.heroArt}>
          <div className={styles.pulse} aria-hidden="true" />
          <Vinyl size={300} />
          <div className={styles.nowPlaying}>
            <Equalizer bars={4} height={16} />
            <Text variant="caption">Now loading: your next night out</Text>
          </div>
        </div>
      </section>

      {/* ---------- genres ticker ---------- */}
      <Marquee speed={30} className={styles.genres}>
        {GENRES.map((g) => (
          <span key={g} className={styles.genre}>
            {g}
          </span>
        ))}
      </Marquee>
      <Marquee speed={42} reverse className={styles.genres}>
        {[...GENRES].reverse().map((g) => (
          <span key={g} className={styles.genreOutline}>
            {g}
          </span>
        ))}
      </Marquee>

      {/* ---------- preview line-up ---------- */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <Text variant="overline" tone="highlight">
            First look
          </Text>
          <Text variant="display">On the way</Text>
        </div>
        <RevealGroup className={styles.gigGrid}>
          {PREVIEW_GIGS.map((g) => (
            <RevealItem key={g.id}>
              <TiltCard className={styles.gig}>
                <PosterArt title={g.title} category="music" seed={g.id} size="card" />
                <div className={styles.gigLock}>
                  <Icon name="lock" size={14} /> Tickets soon
                </div>
              </TiltCard>
              <div className={styles.gigMeta}>
                <Text variant="bodyStrong">{g.title}</Text>
                <Text variant="small" tone="muted">
                  {g.kind} · {g.city} · {g.month}
                </Text>
                <div className={styles.gigGenres}>
                  {g.genres.map((genre) => (
                    <Badge key={genre}>{genre}</Badge>
                  ))}
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      {/* ---------- what's coming ---------- */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <Text variant="overline" tone="highlight">
            Built for live music
          </Text>
          <Text variant="display">What you&apos;ll get</Text>
        </div>
        <RevealGroup className={styles.features}>
          {MUSIC_FEATURES.map((f) => (
            <RevealItem key={f.title}>
              <Card padding="lg" className={styles.feature}>
                <span className={styles.featureIcon}>
                  <Icon name={f.icon} size={20} />
                </span>
                <Text variant="h3">{f.title}</Text>
                <Text tone="secondary">{f.text}</Text>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>
    </div>
  );
}
