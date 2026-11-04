import { Link } from 'react-router-dom';
import { eventPath } from '../../Constants/RouteConstants';
import type { EventSummary } from '../../Models/Event';
import * as fmt from '../../Utils/format';
import { Icon, Text, TiltCard } from '../CustomUI';
import { PosterArt } from '../PosterArt/PosterArt';
import styles from './EventCard.module.scss';

/** A tilting, shiny poster card. On hover, a "Get tickets" bar slides up. */
export function EventCard({ event }: { event: EventSummary }) {
  return (
    <Link to={eventPath(event.id)} className={styles.link} aria-label={`${event.title}, ${event.category}`}>
      <TiltCard className={styles.card}>
        <PosterArt title={event.title} category={event.category} seed={event.id} size="card" />
        <div className={styles.hoverBar}>
          <span>Get tickets</span>
          <Icon name="arrowRight" size={16} />
        </div>
      </TiltCard>
      <div className={styles.meta}>
        <Text variant="h3">{event.title}</Text>
        <Text variant="small" tone="muted">
          {event.category} · {event.language} · {fmt.duration(event.durationMinutes)}
        </Text>
      </div>
    </Link>
  );
}

/** Same shape while loading, so the page doesn't jump when data arrives. */
export function EventCardSkeleton() {
  return (
    <div className={styles.link} aria-hidden="true">
      <div className={styles.skeletonPoster} />
      <div className={styles.meta}>
        <span className={styles.lineLong} />
        <span className={styles.lineShort} />
      </div>
    </div>
  );
}
