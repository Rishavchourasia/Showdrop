import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useDispatchOnMount } from '../../Components/CustomHooks/useDispatchOnMount';
import { useDocumentTitle } from '../../Components/CustomHooks/useDocumentTitle';
import {
  AnimatedNumber,
  Badge,
  Button,
  IconButton,
  InlineAlert,
  Skeleton,
  Stack,
  Text,
  TextLink,
} from '../../Components/CustomUI';
import { FormError } from '../../Components/FormError/FormError';
import { LoadError } from '../../Components/LoadError/LoadError';
import { PosterArt } from '../../Components/PosterArt/PosterArt';
import { SeatMap } from '../../Components/SeatMap/SeatMap';
import { checkoutPath, eventPath, ROUTE_LOGIN } from '../../Constants/RouteConstants';
import type { Seat } from '../../Models/Show';
import { SEATS_HOLD_REQUEST, SEATS_HOLD_RESET, SEAT_TOGGLED, SHOW_REQUEST } from '../../Redux/Actions/ShowConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import * as fmt from '../../Utils/format';
import styles from './Show.module.scss';

/**
 * GET /api/shows/:id -> the seat map. Picking seats only changes Redux state;
 * nothing hits the server until "Pay", which HOLDS the seats (POST /api/bookings)
 * and moves to checkout.
 */
export function ShowPage() {
  const showId = Number(useParams().showId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const showState = useSelector((state: RootState) => state.show);
  const load = { type: SHOW_REQUEST, payload: { showId } };
  useDispatchOnMount([load], [showId]);

  const isThisShow = showState.showId === showId;
  const show = isThisShow ? showState.detail.data : null;
  useDocumentTitle(show?.event.title ?? 'Pick seats');

  // Seats held -> go to checkout (once), then clear the "hold" result for next time.
  const heldBooking = showState.hold.data;
  useEffect(() => {
    if (!heldBooking) return;
    navigate(checkoutPath(heldBooking.id));
    dispatch({ type: SEATS_HOLD_RESET });
  }, [heldBooking, navigate, dispatch]);

  if (isThisShow && showState.detail.err && !show) {
    return <LoadError error={showState.detail.err} onRetry={() => dispatch(load)} />;
  }
  if (!show) {
    return (
      <Stack gap={4}>
        <Skeleton height={56} width="50%" />
        <Skeleton height={460} radius={28} />
      </Stack>
    );
  }

  const chosen = show.seats.filter((s) => showState.selected.includes(s.id) && s.status === 'AVAILABLE');
  const total = chosen.reduce((sum, s) => sum + Number(s.price), 0);
  const free = show.seats.filter((s) => s.status === 'AVAILABLE').length;
  const toggle = (seat: Seat) => dispatch({ type: SEAT_TOGGLED, payload: seat.id });

  const proceed = () => {
    if (!user) {
      // The selection stays in Redux, so it's still here after logging in.
      navigate(ROUTE_LOGIN, { state: { from: location.pathname } });
      return;
    }
    dispatch({ type: SEATS_HOLD_REQUEST });
  };

  return (
    <section>
      <TextLink to={eventPath(show.event.id)} tone="muted" icon="arrowLeft" className={styles.back}>
        {show.event.title}
      </TextLink>

      <div className={styles.header}>
        <div className={styles.thumb}>
          <PosterArt title={show.event.title} category={show.event.category} seed={show.event.id} size="thumb" />
        </div>
        <div className={styles.headerText}>
          <Text variant="h1">{show.event.title}</Text>
          <Text tone="secondary">
            {show.venueName}, {show.city} · {fmt.dateTime(show.startTime)}
          </Text>
        </div>
        <Stack direction="row" gap={2} align="center">
          <Badge tone={free < 10 ? 'warning' : 'success'}>{free} seats left</Badge>
          <IconButton
            icon="refresh"
            label="Refresh seats"
            onClick={() => dispatch(load)}
            disabled={showState.detail.loading}
          />
        </Stack>
      </div>

      <Stack gap={3}>
        <AnimatePresence>
          {showState.notice && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <InlineAlert tone="warning">{showState.notice}</InlineAlert>
            </motion.div>
          )}
        </AnimatePresence>
        <FormError error={showState.hold.err} />
        <SeatMap
          seats={show.seats}
          selected={showState.selected}
          onToggle={toggle}
          focusLabel={show.event.category === 'Movie' ? 'Screen' : 'Stage'}
        />
        <Text variant="small" tone="muted" align="center">
          Seats are held for {show.holdMinutes} minutes while you pay. No booking fees.
        </Text>
      </Stack>

      {/* Floating dock: slides up once you pick a seat; the total counts up as you add more. */}
      <AnimatePresence>
        {chosen.length > 0 && (
          <motion.div
            className={styles.dock}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <div className={styles.dockSeats}>
              <AnimatePresence mode="popLayout">
                {chosen.map((s) => (
                  <motion.button
                    key={s.id}
                    type="button"
                    layout
                    className={styles.seatChip}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.4, opacity: 0 }}
                    onClick={() => toggle(s)}
                    aria-label={`Remove seat ${fmt.seatLabel(s)}`}
                  >
                    {fmt.seatLabel(s)} ×
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
            <div className={styles.dockTotal}>
              <Text variant="caption" tone="muted">
                {chosen.length} seat{chosen.length === 1 ? '' : 's'}
              </Text>
              <AnimatedNumber value={total} format={fmt.money} className={styles.total} />
            </div>
            <Button variant="go" size="lg" shape="pill" loading={showState.hold.loading} onClick={proceed}>
              {showState.hold.loading ? 'Holding…' : user ? 'Hold & pay' : 'Log in to book'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
