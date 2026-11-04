import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppShell, RequireAuth } from './App/Components/AppShell/AppShell';
import * as route from './App/Constants/RouteConstants';

/*
 * URL -> page. Browsing is public; checkout and tickets need a login.
 *
 * Pages are LAZY-loaded: each one is a separate JavaScript file that the browser
 * downloads only when you first visit it, so the first page appears faster.
 * (AppShell shows a spinner in the page area while one loads.)
 */
const EventsPage = lazy(() => import('./App/Views/Events/EventsPage').then((m) => ({ default: m.EventsPage })));
const EventDetailPage = lazy(() =>
  import('./App/Views/EventDetail/EventDetailPage').then((m) => ({ default: m.EventDetailPage })),
);
const ShowPage = lazy(() => import('./App/Views/Show/ShowPage').then((m) => ({ default: m.ShowPage })));
const MusicPage = lazy(() => import('./App/Views/Music/MusicPage').then((m) => ({ default: m.MusicPage })));
const AuthPage = lazy(() => import('./App/Views/Auth/AuthPage').then((m) => ({ default: m.AuthPage })));
const CheckoutPage = lazy(() => import('./App/Views/Checkout/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const MyBookingsPage = lazy(() =>
  import('./App/Views/Bookings/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })),
);
const NotFoundPage = lazy(() => import('./App/Views/NotFound/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

export default function AppRouting() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<EventsPage />} />
        <Route path={route.ROUTE_EVENT} element={<EventDetailPage />} />
        <Route path={route.ROUTE_SHOW} element={<ShowPage />} />
        <Route path={route.ROUTE_MUSIC} element={<MusicPage />} />
        <Route path={route.ROUTE_LOGIN} element={<AuthPage mode="login" />} />
        <Route path={route.ROUTE_SIGNUP} element={<AuthPage mode="signup" />} />
        <Route element={<RequireAuth />}>
          <Route path={route.ROUTE_CHECKOUT} element={<CheckoutPage />} />
          <Route path={route.ROUTE_BOOKINGS} element={<MyBookingsPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
