import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * The app talks to nothing and loads nothing from anywhere else, so it can
 * declare that outright. Build only: the dev server needs inline scripts and a
 * websocket for hot reload, and a policy that allowed those would be worth
 * much less.
 *
 * img-src carries data: because a traced base image is stored as a data URL,
 * and blob: because exports go out through object URLs.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
  // frame-ancestors is deliberately absent: it is ignored when delivered in a
  // meta tag and only warns. public/_headers carries it for hosts that can
  // send real headers.
].join('; ');

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), contentSecurityPolicy()],
  build: {
    // Vite's preload helper would otherwise be inlined, and an inline script is
    // exactly what script-src 'self' is there to rule out.
    modulePreload: { polyfill: false },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
