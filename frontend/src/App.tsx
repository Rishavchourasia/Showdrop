import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './App/Components/ErrorBoundary/ErrorBoundary';
import { GlobalExceptionModal } from './App/Components/ExceptionModal/ExceptionModal';
import { IntroContext } from './App/Components/Intro/IntroContext';
import { TicketIntro } from './App/Components/TicketIntro/TicketIntro';
import { Toaster } from './App/Components/Toaster/Toaster';
import { infoStore } from './App/Utils/InfoStore';
import { prefersReducedMotion } from './App/Utils/motion';
import { enableSmoothScroll, holdScroll } from './App/Utils/smoothScroll';
import AppRouting from './AppRouting';

/*
 * App-wide pieces that sit around every page:
 *   TicketIntro    the opening ticket-tear (home page, once per session, skipped with reduced motion)
 *   IntroContext   tells hero entrances to wait until the ticket has been torn
 *   ErrorBoundary  a crash while rendering shows a friendly fallback instead of a blank screen
 *   GlobalExceptionModal unexpected errors (server down, session expired) from any saga or component
 *   Toaster        short success messages ("Booking confirmed")
 *   MotionConfig   reducedMotion="user": every animation respects the OS "reduce motion" setting
 */

// The intro plays once per session, only on the home page, never with reduced motion.
const introAlreadySeen = () => prefersReducedMotion() || window.location.pathname !== '/' || infoStore.introSeen();

export default function App() {
  const [introDone, setIntroDone] = useState(introAlreadySeen);

  useEffect(() => enableSmoothScroll(), []); // smooth wheel scrolling for the whole app
  useEffect(() => holdScroll('intro', !introDone), [introDone]); // no scrolling during the intro

  const finishIntro = useCallback(() => {
    setIntroDone(true);
    infoStore.markIntroSeen();
  }, []);

  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <IntroContext.Provider value={introDone}>
          <TicketIntro done={introDone} onDone={finishIntro} />
          <ErrorBoundary>
            <AppRouting />
          </ErrorBoundary>
        </IntroContext.Provider>
        <GlobalExceptionModal />
        <Toaster />
      </MotionConfig>
    </BrowserRouter>
  );
}
