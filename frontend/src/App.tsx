import { MotionConfig } from 'motion/react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './App/Components/ErrorBoundary/ErrorBoundary';
import { GlobalExceptionModal } from './App/Components/ExceptionModal/ExceptionModal';
import { Toaster } from './App/Components/Toaster/Toaster';
import AppRouting from './AppRouting';

/*
 * App-wide pieces that sit around every page:
 *   ErrorBoundary  a crash while rendering shows a friendly fallback instead of a blank screen
 *   GlobalExceptionModal unexpected errors (server down, session expired) from any saga or component
 *   Toaster        short success messages ("Booking confirmed")
 *   MotionConfig   reducedMotion="user": every animation respects the OS "reduce motion" setting
 */
export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <ErrorBoundary>
          <AppRouting />
        </ErrorBoundary>
        <GlobalExceptionModal />
        <Toaster />
      </MotionConfig>
    </BrowserRouter>
  );
}
