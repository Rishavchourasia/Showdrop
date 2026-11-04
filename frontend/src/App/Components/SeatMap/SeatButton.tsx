import type { Seat } from '../../Models/Show';
import { cx } from '../../Utils/cx';
import * as fmt from '../../Utils/format';
import styles from './SeatMap.module.scss';

/*
 * One seat. Its look comes from its state:
 *   available (outlined) -> selected (filled green) | held (amber) | booked (grey)
 * Held and booked seats are disabled, so they can't be clicked at all.
 */
interface SeatButtonProps {
  seat: Seat;
  selected: boolean;
  /** Leave a walkway after this seat. */
  aisleAfter?: boolean;
  onToggle: (seat: Seat) => void;
}

export function SeatButton({ seat, selected, aisleAfter, onToggle }: SeatButtonProps) {
  const unavailable = seat.status !== 'AVAILABLE';
  const isSelected = selected && !unavailable;
  const label = fmt.seatLabel(seat);
  return (
    <button
      type="button"
      className={cx(
        styles.seat,
        isSelected ? styles.selected : styles[seat.status.toLowerCase()],
        aisleAfter && styles.aisle,
      )}
      disabled={unavailable}
      aria-pressed={isSelected}
      aria-label={`Seat ${label}, ${seat.category}, ${seat.status.toLowerCase()}`}
      onClick={() => onToggle(seat)}
      data-tip={`${label} · ${fmt.money(seat.price)}`}
    >
      {seat.seatNumber}
    </button>
  );
}

/** A small swatch for the legend under the map. */
export function SeatSwatch({ state }: { state: 'available' | 'selected' | 'held' | 'booked' }) {
  return <i className={cx(styles.seat, styles.swatch, styles[state])} aria-hidden="true" />;
}
