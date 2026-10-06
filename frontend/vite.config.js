import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Production builds only: drop debug output (console.log / info / debug) and `debugger` statements.
  // console.warn and console.error are kept so real problems can still be diagnosed.
  // `npm run dev` is unaffected, so logs stay visible while developing.
  esbuild: command === 'build'
    ? { pure: ['console.log', 'console.info', 'console.debug'], drop: ['debugger'] }
    : {},
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/broadcasting': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
}));
