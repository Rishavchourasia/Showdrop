import { createContext, useContext } from 'react';

/**
 * Whether the opening ticket animation has finished. Hero entrances wait on it,
 * so they play when the page is actually visible instead of underneath the intro.
 */
export const IntroContext = createContext(true);

export const useIntroDone = () => useContext(IntroContext);
