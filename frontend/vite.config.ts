import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/*
 * Vite = dev server + bundler. The proxy forwards same-origin calls to the
 * services, so the app only ever calls "/api" and "/agent" (no CORS). In Docker
 * and Kubernetes, nginx plays this role (see nginx.conf).
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080', // Java Spring Boot backend
      '/agent': 'http://localhost:8000', // Python AI agent
    },
  },

  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
