// Display formatting in one place, so every page shows money and dates the same way.
const moneyFmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function money(n: number): string {
  return moneyFmt.format(n);
}

export function dateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export function duration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function clock(totalSeconds: number): string {
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const ss = String(totalSeconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export const seatLabel = (s: { rowLabel: string; seatNumber: number }) => `${s.rowLabel}${s.seatNumber}`;
