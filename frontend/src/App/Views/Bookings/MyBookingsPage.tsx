import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../Components/AppShell/PageHeader';
import { useDispatchOnMount } from '../../Components/CustomHooks/useDispatchOnMount';
import { Badge, ButtonLink, EmptyState, Icon, Skeleton, Stack, Tabs, Text } from '../../Components/CustomUI';
import { LoadError } from '../../Components/LoadError/LoadError';
import { PosterArt } from '../../Components/PosterArt/PosterArt';
import { BOOKING_STATUS_TONE } from '../../Constants/optionConstants';
import { checkoutPath, ROUTE_HOME } from '../../Constants/RouteConstants';
import type { Booking } from '../../Models/Booking';
import { EVENTS_REQUEST } from '../../Redux/Actions/EventConstants';
import { MY_BOOKINGS_REQUEST } from '../../Redux/Actions/BookingConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import { cx } from '../../Utils/cx';
import * as fmt from '../../Utils/format';
import styles from './Bookings.module.scss';

type View = 'active' | 'pending' | 'past';
const FILTER: Record<View, (b: Booking) => boolean> = {
  active: (b) => b.status === 'CONFIRMED',
  pending: (b) => b.status === 'PENDING',
  past: (b) => b.status === 'CANCELLED' || b.status === 'EXPIRED',
};

/** GET /api/bookings/me (needs the JWT) -> the user's tickets as a stack of stubs. */
export function MyBookingsPage() {
  const dispatch = useDispatch();
  const mine = useSelector((state: RootState) => state.bookings.mine);
  const events = useSelector((state: RootState) => state.events.list.data);
  useDispatchOnMount([{ type: MY_BOOKINGS_REQUEST }, ...(events ? [] : [{ type: EVENTS_REQUEST }])]);
  const [view, setView] = useState<View>('active');

  const categoryOf = (eventId: number) => events?.find((e) => e.id === eventId)?.category ?? 'Movie';
  const counts = useMemo(() => {
    const all = mine.data ?? [];
    return {
      active: all.filter(FILTER.active).length,
      pending: all.filter(FILTER.pending).length,
      past: all.filter(FILTER.past).length,
    };
  }, [mine.data]);
  const list = (mine.data ?? []).filter(FILTER[view]);

  return (
    <section>
      <PageHeader title="My tickets" subtitle="Everything you've booked, in one wallet." />
      {mine.err && !mine.data ? (
        <LoadError error={mine.err} onRetry={() => dispatch({ type: MY_BOOKINGS_REQUEST })} />
      ) : !mine.data ? (
        <Stack gap={3}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} height={120} radius={20} />
          ))}
        </Stack>
      ) : mine.data.length === 0 ? (
        <EmptyState
          icon="ticket"
          title="Your wallet is empty"
          description="Find something to watch and your tickets will land here."
          action={
            <ButtonLink to={ROUTE_HOME} variant="primary" shape="pill">
              Discover events
            </ButtonLink>
          }
        />
      ) : (
        <Stack gap={5}>
          <Tabs
            label="Ticket status"
            value={view}
            onChange={setView}
            options={[
              { value: 'active', label: 'Upcoming', badge: <span className={styles.count}>{counts.active}</span> },
              { value: 'pending', label: 'In checkout', badge: <span className={styles.count}>{counts.pending}</span> },
              { value: 'past', label: 'Past & cancelled', badge: <span className={styles.count}>{counts.past}</span> },
            ]}
          />
          <div className={styles.list}>
            <AnimatePresence mode="popLayout">
              {list.length === 0 && (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <EmptyState icon="ticket" title="Nothing in this list" />
                </motion.div>
              )}
              {list.map((b, i) => (
                <motion.article
                  key={b.id}
                  layout
                  className={cx(styles.stub, view === 'past' && styles.inactive)}
                  initial={{ opacity: 0, x: -24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 160, damping: 20 }}
                >
                  <div className={styles.poster}>
                    <PosterArt title={b.eventTitle} category={categoryOf(b.eventId)} seed={b.eventId} size="thumb" />
                  </div>
                  <div className={styles.info}>
                    <div className={styles.title}>
                      <Text variant="h3" as="span">
                        {b.eventTitle}
                      </Text>
                      <Badge tone={BOOKING_STATUS_TONE[b.status]}>{b.status}</Badge>
                    </div>
                    <Text variant="small" tone="secondary">
                      <Icon name="calendar" size={13} /> {fmt.dateTime(b.show.startTime)} ·{' '}
                      <Icon name="mapPin" size={13} /> {b.show.venueName}, {b.show.city}
                    </Text>
                    <Text variant="mono" tone="muted">
                      #{b.id} · seats {b.seats.map(fmt.seatLabel).join(' ')}
                    </Text>
                  </div>
                  <div className={styles.side}>
                    <Text variant="h2" tabular>
                      {fmt.money(b.totalAmount)}
                    </Text>
                    {b.status === 'PENDING' ? (
                      <ButtonLink to={checkoutPath(b.id)} variant="go" size="sm" shape="pill">
                        Finish paying
                      </ButtonLink>
                    ) : b.status === 'CONFIRMED' ? (
                      <Link to={checkoutPath(b.id)} className={styles.view}>
                        View ticket <Icon name="arrowRight" size={14} />
                      </Link>
                    ) : null}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        </Stack>
      )}
    </section>
  );
}
