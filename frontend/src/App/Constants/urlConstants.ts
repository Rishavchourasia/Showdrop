// Same-origin paths. Vite (dev) or nginx (Docker/Kubernetes) forwards them to the right service.
export const apiBaseUrl = '/api'; // Java Spring Boot backend
export const authApiBaseUrl = `${apiBaseUrl}/auth`;
export const eventsApiUrl = `${apiBaseUrl}/events`;
export const showsApiUrl = `${apiBaseUrl}/shows`;
export const bookingsApiUrl = `${apiBaseUrl}/bookings`;
export const agentApiUrl = '/agent'; // Python AI agent
