import type { AppError } from '../../Models/HttpModels';
import { friendlyMessage } from '../../Utils/errors';
import { Button, EmptyState, Icon } from '../CustomUI';

/** A page's data failed to load: say why, offer a retry. */
export function LoadError({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  return (
    <EmptyState
      icon="alert"
      title="Couldn't load this"
      description={friendlyMessage(error)}
      action={
        <Button onClick={onRetry}>
          <Icon name="refresh" size={16} />
          Try again
        </Button>
      }
    />
  );
}
