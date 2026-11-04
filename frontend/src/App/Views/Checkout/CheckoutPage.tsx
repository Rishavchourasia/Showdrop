import { motion } from 'motion/react';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Confetti } from '../../Components/Confetti/Confetti';
import { useCountdown } from '../../Components/CustomHooks/useCountdown';
import { useDispatchOnMount } from '../../Components/CustomHooks/useDispatchOnMount';
import { useDocumentTitle } from '../../Components/CustomHooks/useDocumentTitle';
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  Icon,
  InlineAlert,
  ProgressRing,
  Skeleton,
  Stack,
  Text,
} from '../../Components/CustomUI';
import { FormError } from '../../Components/FormError/FormError';
import { LoadError } from '../../Components/LoadError/LoadError';
import { TicketSummary } from '../../Components/TicketSummary/TicketSummary';
import { ROUTE_BOOKINGS, ROUTE_HOME, showPath } from '../../Constants/RouteConstants';
import { BOOKING_CANCEL_REQUEST, BOOKING_CONFIRM_REQUEST, BOOKING_REQUEST } from '../../Redux/Actions/BookingConstants';
import type { RootState } from '../../Redux/Reducers/reducers';
import * as fmt from '../../Utils/format';
import styles from './Checkout.module.scss';

const HOLD_SECONDS = 5 * 60;

/**
 * The 5-minute checkout window. The seats are HELD in Redis while this page is
 * open. "Pay" (POST /api/bookings/:id/confirm) only succeeds while the hold is
 * still ours. There's no real payment gateway: clicking Pay simulates it.
 */
export function CheckoutPage() {
  const bookingId = Number(useParams().bookingId);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, action } = useSelector((state: RootState) => state.bookings);
  const load = { type: BOOKING_REQUEST, payload: { bookingId } };
  useDispatchOnMount([load], [bookingId]);

  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const booking = current.data?.id === bookingId ? current.data : null;
  const secondsLeft = useCountdown(booking?.status === 'PENDING' ? booking.expiresAt : null);
  useDocumentTitle(booking?.status === 'CONFIRMED' ? "You're going!" : 'Checkout');

  if (current.err && !booking) return <LoadError error={current.err} onRetry={() => dispatch(load)} />;
  if (!booking) {
    return (
      <Stack gap={4} className={styles.narrow}>
        <Skeleton height={48} width="60%" />
        <Skeleton height={200} radius={28} />
      </Stack>
    );
  }

  const timedOut = booking.status === 'PENDING' && secondsLeft === 0;

  if (booking.status === 'CONFIRMED') {
    return (
      <Stack gap={6} className={styles.narrow}>
        {justPaid && <Confetti />}
        <motion.div
          className={styles.celebrate}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
        >
          <span className={styles.check}>
            <Icon name="check" size={28} />
          </span>
          <Text variant="display">You&apos;re going!</Text>
          <Text tone="secondary">
            Booking #{booking.id} is confirmed. Your ticket is on its way to your inbox (the notifications service logs
            it, that&apos;s our &quot;email&quot; for now).
          </Text>
        </motion.div>
        {/* The ticket "prints": it slides out of a slot. */}
        <div className={styles.slot}>
          <motion.div
            initial={{ y: -60, opacity: 0, rotateX: 40 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 80, damping: 14 }}
          >
            <TicketSummary booking={booking} />
          </motion.div>
        </div>
        <Text variant="small" tone="muted" align="center">
          Tip: press and hold the code to reveal it at the door.
        </Text>
        <Stack direction="row" gap={2} wrap justify="center">
          <ButtonLink to={ROUTE_BOOKINGS} variant="primary" shape="pill">
            All my tickets
          </ButtonLink>
          <ButtonLink to={ROUTE_HOME} variant="ghost" shape="pill">
            Find another show
          </ButtonLink>
        </Stack>
      </Stack>
    );
  }

  if (booking.status !== 'PENDING' || timedOut) {
    return (
      <Stack gap={5} className={styles.narrow}>
        <Text variant="display">{booking.status === 'CANCELLED' ? 'Booking cancelled' : 'Time ran out'}</Text>
        <InlineAlert tone="info">
          {booking.status === 'CANCELLED'
            ? 'You cancelled this booking. The seats have been released.'
            : 'Your 5-minute hold expired and the seats went back on sale.'}
        </InlineAlert>
        <TicketSummary booking={booking} />
        <div>
          <ButtonLink to={showPath(booking.show.id)} variant="primary" shape="pill">
            Pick seats again
          </ButtonLink>
        </div>
      </Stack>
    );
  }

  const urgent = secondsLeft < 60;

  return (
    <Stack gap={6} className={styles.narrow}>
      <div className={styles.head}>
        <div>
          <Text variant="overline" tone="highlight">
            Step 2 of 2
          </Text>
          <Text variant="display">Checkout</Text>
          <Text tone="secondary">
            Your seats are locked for you. Nobody else can take them until the timer runs out.
          </Text>
        </div>
        <ProgressRing progress={secondsLeft / HOLD_SECONDS} size={116} tone={urgent ? 'danger' : 'highlight'}>
          <motion.span
            className={styles.clock}
            animate={urgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={urgent ? { repeat: Infinity, duration: 1 } : undefined}
          >
            {fmt.clock(secondsLeft)}
          </motion.span>
          <Text variant="caption" tone="muted">
            left
          </Text>
        </ProgressRing>
      </div>

      <FormError error={action.err} />
      <TicketSummary booking={booking} />

      <Stack direction="row" gap={3} wrap align="center">
        <Button
          variant="go"
          size="lg"
          shape="pill"
          loading={action.kind === 'confirm'}
          disabled={action.kind !== null}
          onClick={() => {
            setJustPaid(true);
            dispatch({ type: BOOKING_CONFIRM_REQUEST, payload: { bookingId } });
          }}
        >
          Pay {fmt.money(booking.totalAmount)}
        </Button>
        <Button
          variant="ghost"
          size="lg"
          shape="pill"
          disabled={action.kind !== null}
          onClick={() => setConfirmingCancel(true)}
        >
          Release seats
        </Button>
        <Text variant="small" tone="muted">
          Demo payment. No real money moves.
        </Text>
      </Stack>

      {/* The reusable ConfirmDialog (built on Modal) guards an action that can't be undone. */}
      <ConfirmDialog
        open={confirmingCancel}
        title="Release these seats?"
        tone="danger"
        confirmLabel="Release seats"
        cancelLabel="Keep them"
        loading={action.kind === 'cancel'}
        onCancel={() => setConfirmingCancel(false)}
        onConfirm={() => {
          setConfirmingCancel(false);
          dispatch({ type: BOOKING_CANCEL_REQUEST, payload: { bookingId } });
          navigate(showPath(booking.show.id));
        }}
      >
        {`${booking.seats.map(fmt.seatLabel).join(', ')} will be released right away, and someone else may book them.`}
      </ConfirmDialog>
    </Stack>
  );
}
