import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset paths, so the build works from any sub-path (e.g. GitHub Pages at /HiSab/).
  base: './',
  plugins: [react(), tailwindcss()],
  // Optional edge mode: `npm run edge` starts a proxy to a local model on this port.
  server: { proxy: { '/api': 'http://127.0.0.1:8787' } },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
  },
});
