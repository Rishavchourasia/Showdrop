import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { useDispatchOnMount } from '../../Components/CustomHooks/useDispatchOnMount';
import { useDocumentTitle } from '../../Components/CustomHooks/useDocumentTitle';
import { Badge, EmptyState, Icon, Skeleton, Stack, Tabs, Text, TextLink, TiltCard } from '../../Components/CustomUI';
import { LoadError } from '../../Components/LoadError/LoadError';
import { PosterArt } from '../../Components/PosterArt/PosterArt';
import { ROUTE_HOME, showPath } from '../../Constants/RouteConstants';
import type { ShowSummary } from '../../Models/Event';
import { EVENT_DETAIL_REQUEST } from '../../Redux/Actions/EventConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import * as fmt from '../../Utils/format';
import styles from './EventDetail.module.scss';

const dayKey = (iso: string) => new Date(iso).toDateString();

/** GET /api/events/:id -> an immersive event page; pick a day, then a venue/time. */
export function EventDetailPage() {
  const eventId = Number(useParams().eventId); // the ":eventId" part of the URL
  const dispatch = useDispatch();
  const { data, err } = useSelector((state: RootState) => state.events.detail);
  const event = data?.id === eventId ? data : null;
  const load = { type: EVENT_DETAIL_REQUEST, payload: { eventId } };
  useDispatchOnMount([load], [eventId]);
  useDocumentTitle(event?.title ?? 'Event');

  // Group shows by calendar day for the date picker.
  const days = useMemo(() => {
    const map = new Map<string, ShowSummary[]>();
    for (const s of event?.shows ?? []) {
      const k = dayKey(s.startTime);
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return [...map.entries()];
  }, [event]);
  const [day, setDay] = useState<string | null>(null);
  const activeDay = day && days.some(([k]) => k === day) ? day : (days[0]?.[0] ?? null);
  const shows = days.find(([k]) => k === activeDay)?.[1] ?? [];

  if (err && !event) return <LoadError error={err} onRetry={() => dispatch(load)} />;
  if (!event) {
    return (
      <div className={styles.layout}>
        <Skeleton height={420} radius={20} />
        <Stack gap={3}>
          <Skeleton height={48} width="70%" />
          <Skeleton height={20} width="40%" />
          <Skeleton height={120} />
        </Stack>
      </div>
    );
  }

  return (
    <section>
      {/* the poster's colours, blown up and blurred, become the page's backdrop */}
      <div className={styles.backdrop} aria-hidden="true">
        <PosterArt title="" category={event.category} seed={event.id} showTitle={false} size="hero" />
      </div>

      <TextLink to={ROUTE_HOME} tone="muted" icon="arrowLeft" className={styles.back}>
        All events
      </TextLink>

      <div className={styles.layout}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 110, damping: 16 }}
        >
          <TiltCard className={styles.poster} intensity={8}>
            <PosterArt title={event.title} category={event.category} seed={event.id} size="hero" />
          </TiltCard>
        </motion.div>

        <motion.div
          className={styles.info}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 110, damping: 20 }}
        >
          <Stack direction="row" gap={2} wrap>
            <Badge tone="accent">{event.category}</Badge>
            <Badge>{event.language}</Badge>
            <Badge>
              <Icon name="clock" size={12} /> {fmt.duration(event.durationMinutes)}
            </Badge>
          </Stack>
          <Text variant="display">{event.title}</Text>
          <Text tone="secondary" className={styles.description}>
            {event.description}
          </Text>

          <div className={styles.pick}>
            <Text variant="overline" tone="highlight">
              Pick a day
            </Text>
            {days.length === 0 ? (
              <EmptyState icon="calendar" title="No shows scheduled" />
            ) : (
              <>
                <Tabs
                  label="Show date"
                  value={activeDay ?? ''}
                  onChange={setDay}
                  options={days.map(([k, list]) => ({
                    value: k,
                    label: new Date(list[0].startTime).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    }),
                  }))}
                />
                <div className={styles.shows}>
                  <AnimatePresence mode="popLayout">
                    {shows.map((s, i) => (
                      <motion.div
                        key={s.id}
                        layout
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ delay: i * 0.05, type: 'spring', stiffness: 200, damping: 22 }}
                      >
                        <Link to={showPath(s.id)} className={styles.show}>
                          <div className={styles.showTime}>
                            {new Date(s.startTime).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                          </div>
                          <div className={styles.showVenue}>
                            <Text variant="bodyStrong">{s.venueName}</Text>
                            <Text variant="small" tone="muted">
                              <Icon name="mapPin" size={13} /> {s.city}
                            </Text>
                          </div>
                          <span className={styles.showGo}>
                            Seats <Icon name="arrowRight" size={16} />
                          </span>
                        </Link>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
