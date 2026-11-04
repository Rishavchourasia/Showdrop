// Every URL in one place, so a route rename is a one-line change.
export const ROUTE_HOME = '/';
export const ROUTE_LOGIN = '/login';
export const ROUTE_SIGNUP = '/signup';
export const ROUTE_EVENT = '/events/:eventId';
export const ROUTE_SHOW = '/shows/:showId';
export const ROUTE_CHECKOUT = '/checkout/:bookingId';
export const ROUTE_BOOKINGS = '/bookings';
export const ROUTE_MUSIC = '/music'; // UI preview only: the music backend comes later

export const eventPath = (id: number) => `/events/${id}`;
export const showPath = (id: number) => `/shows/${id}`;
export const checkoutPath = (id: number) => `/checkout/${id}`;
