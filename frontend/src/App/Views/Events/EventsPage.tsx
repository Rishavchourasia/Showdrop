import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useDispatchOnMount } from '../../Components/CustomHooks/useDispatchOnMount';
import { useDocumentTitle } from '../../Components/CustomHooks/useDocumentTitle';
import { Badge, ButtonLink, EmptyState, Icon, Reveal, Tabs, Text } from '../../Components/CustomUI';
import { EventCard, EventCardSkeleton } from '../../Components/EventCard/EventCard';
import { LoadError } from '../../Components/LoadError/LoadError';
import { Equalizer } from '../../Components/MusicVisuals/MusicVisuals';
import { ROUTE_MUSIC } from '../../Constants/RouteConstants';
import { EVENTS_REQUEST } from '../../Redux/Actions/EventConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import { Hero } from './Hero';
import styles from './Events.module.scss';

type Filter = 'all' | 'Movie' | 'Concert' | 'Comedy' | 'Theatre' | 'music';

const FILTERS = [
  { value: 'all', label: 'Everything' },
  { value: 'Movie', label: 'Movies' },
  { value: 'Comedy', label: 'Comedy' },
  { value: 'Theatre', label: 'Theatre' },
  { value: 'Concert', label: 'Concerts' },
  { value: 'music', label: 'Gigs & festivals', badge: <Badge tone="soon">Soon</Badge> },
] as const;

/*
 * The pattern every page follows:
 *   1. dispatch a *_REQUEST action when the page opens (a saga does the API call)
 *   2. select the RequestState from Redux and render loading / error / data
 * Filtering is local UI state: the grid re-flows with a layout animation.
 */
export function EventsPage() {
  useDocumentTitle('Discover');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const list = useSelector((state: RootState) => state.events.list);
  const [filter, setFilter] = useState<Filter>('all');
  useDispatchOnMount([{ type: EVENTS_REQUEST }]);

  const events = useMemo(
    () => (list.data ?? []).filter((e) => filter === 'all' || e.category === filter),
    [list.data, filter],
  );

  const onFilter = (f: Filter) => (f === 'music' ? navigate(ROUTE_MUSIC) : setFilter(f));

  return (
    <>
      <Hero featured={list.data ?? []} />

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <Text variant="overline" tone="highlight">
              Now booking
            </Text>
            <Text variant="display">What&apos;s on</Text>
          </div>
          <Tabs label="Filter by category" options={FILTERS} value={filter} onChange={onFilter} />
        </div>

        {list.err && !list.data ? (
          <LoadError error={list.err} onRetry={() => dispatch({ type: EVENTS_REQUEST })} />
        ) : !list.data ? (
          <div className={styles.grid}>
            {Array.from({ length: 4 }, (_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState icon="ticket" title="Nothing here yet" description="Try another category." />
        ) : (
          <motion.div layout className={styles.grid}>
            <AnimatePresence mode="popLayout">
              {events.map((e, i) => (
                <motion.div
                  key={e.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 160, damping: 20, delay: i * 0.04 }}
                >
                  <EventCard event={e} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </section>

      <Reveal>
        <section className={styles.musicPromo}>
          <div className={styles.musicPromoGlow} aria-hidden="true" />
          <div>
            <Badge tone="soon">Coming soon</Badge>
            <Text variant="display" className={styles.musicPromoTitle}>
              Live music, <span>front row.</span>
            </Text>
            <Text tone="secondary">
              Gigs, club nights and festivals, with the same live seat maps and zero fees. Join the waitlist for early
              access.
            </Text>
          </div>
          <div className={styles.musicPromoSide}>
            <Equalizer bars={14} height={64} />
            <ButtonLink to={ROUTE_MUSIC} variant="primary" shape="pill">
              Get early access <Icon name="arrowRight" size={16} />
            </ButtonLink>
          </div>
        </section>
      </Reveal>
    </>
  );
}
