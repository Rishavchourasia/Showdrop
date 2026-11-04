import type { Seat } from '../../Models/Show';
import * as fmt from '../../Utils/format';
import { Text } from '../CustomUI';
import { SeatButton, SeatSwatch } from './SeatButton';
import styles from './SeatMap.module.scss';

/*
 * Draws the seats as a grid with the screen at the bottom.
 * A "controlled" component: it doesn't own the selection. The parent passes
 * `selected` (from Redux) and is told about clicks via `onToggle`.
 */
interface SeatMapProps {
  seats: Seat[];
  selected: number[];
  onToggle: (seat: Seat) => void;
  /** "Screen" for movies, "Stage" for live shows. */
  focusLabel?: string;
}

const AISLE_AFTER = 5; // a walkway between seat 5 and seat 6

export function SeatMap({ seats, selected, onToggle, focusLabel = 'Screen' }: SeatMapProps) {
  const rows = new Map<string, Seat[]>();
  for (const seat of seats) {
    if (!rows.has(seat.rowLabel)) rows.set(seat.rowLabel, []);
    rows.get(seat.rowLabel)!.push(seat);
  }
  // Back rows (premium) at the top, row A nearest the screen, like a real cinema.
  const ordered = [...rows.entries()].reverse();
  const picked = new Set(selected);

  return (
    <div className={styles.seatmap}>
      <div className={styles.scroll}>
        {ordered.map(([row, rowSeats], i) => {
          const category = rowSeats[0].category;
          const newBand = i === 0 || ordered[i - 1][1][0].category !== category;
          return (
            <div key={row}>
              {newBand && (
                <div className={styles.band}>
                  <Text variant="overline" tone="muted">
                    {category} · {fmt.money(rowSeats[0].price)}
                  </Text>
                </div>
              )}
              <div className={styles.row}>
                <span className={styles.rowLabel}>{row}</span>
                {rowSeats.map((seat) => (
                  <SeatButton
                    key={seat.id}
                    seat={seat}
                    selected={picked.has(seat.id)}
                    aisleAfter={seat.seatNumber === AISLE_AFTER}
                    onToggle={onToggle}
                  />
                ))}
                <span className={styles.rowLabel}>{row}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className={styles.screen}>
        <span className={styles.screenGlow} aria-hidden="true" />
        <Text variant="overline" tone="secondary">
          {focusLabel} this way
        </Text>
      </div>
      <div className={styles.legend}>
        <span>
          <SeatSwatch state="available" /> Available
        </span>
        <span>
          <SeatSwatch state="selected" /> Selected
        </span>
        <span>
          <SeatSwatch state="held" /> Held (someone&apos;s checking out)
        </span>
        <span>
          <SeatSwatch state="booked" /> Booked
        </span>
      </div>
    </div>
  );
}
