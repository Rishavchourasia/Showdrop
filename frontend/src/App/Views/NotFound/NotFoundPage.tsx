import { motion } from 'motion/react';
import { useDocumentTitle } from '../../Components/CustomHooks/useDocumentTitle';
import { ButtonLink, Stack, Text } from '../../Components/CustomUI';
import { ROUTE_HOME } from '../../Constants/RouteConstants';
import styles from './NotFound.module.scss';

export function NotFoundPage() {
  useDocumentTitle('Not found');
  return (
    <Stack gap={5} align="center" className={styles.page}>
      <motion.div
        className={styles.code}
        initial={{ rotate: -8, scale: 0.8, opacity: 0 }}
        animate={{ rotate: [-8, 4, -2, 0], scale: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        404
      </motion.div>
      <Text variant="h1" align="center">
        This seat doesn&apos;t exist.
      </Text>
      <Text tone="secondary" align="center">
        The page you were looking for left before the interval.
      </Text>
      <ButtonLink to={ROUTE_HOME} variant="primary" shape="pill">
        Back to the show
      </ButtonLink>
    </Stack>
  );
}
