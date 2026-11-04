import { useSelector } from 'react-redux';
import { BOOKING_STATUS_TONE } from '../../Constants/optionConstants';
import type { Booking } from '../../Models/Booking';
import type { RootState } from '../../Redux/Reducers/reducers';
import { cx } from '../../Utils/cx';
import * as fmt from '../../Utils/format';
import { Badge, Text, TiltCard } from '../CustomUI';
import { PosterArt } from '../PosterArt/PosterArt';
import { TicketQR } from '../TicketQR/TicketQR';
import styles from './TicketSummary.module.scss';

/*
 * A real-looking ticket: poster strip, details, perforated tear line and a stub.
 * Confirmed tickets get the holographic tilt and the hold-to-reveal entry code.
 */
export function TicketSummary({ booking }: { booking: Booking }) {
  // Bookings don't carry the category, so borrow it from the events list (for the poster colours).
  const category = useSelector(
    (state: RootState) => state.events.list.data?.find((e) => e.id === booking.eventId)?.category ?? 'Movie',
  );
  const confirmed = booking.status === 'CONFIRMED';
  const ticket = (
    <div className={cx(styles.ticket, confirmed && styles.confirmed)}>
      <div className={styles.strip}>
        <PosterArt
          title={booking.eventTitle}
          category={category}
          seed={booking.eventId}
          showTitle={false}
          size="thumb"
        />
      </div>
      <div className={styles.main}>
        <Text variant="overline" tone="muted">
          Admit {booking.seats.length}
        </Text>
        <Text variant="h2">{booking.eventTitle}</Text>
        <dl className={styles.facts}>
          <div>
            <dt>Venue</dt>
            <dd>
              {booking.show.venueName}, {booking.show.city}
            </dd>
          </div>
          <div>
            <dt>When</dt>
            <dd>{fmt.dateTime(booking.show.startTime)}</dd>
          </div>
          <div>
            <dt>Seats</dt>
            <dd className={styles.seats}>{booking.seats.map(fmt.seatLabel).join('  ')}</dd>
          </div>
        </dl>
      </div>
      <div className={styles.stub}>
        {confirmed ? (
          <TicketQR bookingId={booking.id} />
        ) : (
          <>
            <Text variant="caption" tone="muted">
              Total
            </Text>
            <Text variant="h1" tabular>
              {fmt.money(booking.totalAmount)}
            </Text>
          </>
        )}
        <Badge tone={BOOKING_STATUS_TONE[booking.status]}>{booking.status}</Badge>
      </div>
    </div>
  );
  return confirmed ? (
    <TiltCard className={styles.tilt} intensity={6}>
      {ticket}
    </TiltCard>
  ) : (
    ticket
  );
}
