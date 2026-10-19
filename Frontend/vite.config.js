import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Quest — tareas y hábitos',
        short_name: 'Quest',
        description: 'Tareas, hábitos y foco, en forma de juego.',
        lang: 'es',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: {
        // Las llamadas a la API nunca se sirven desde caché.
        navigateFallbackDenylist: [/^\/api/],
      },
    }),
  ],
  server: {
    // En desarrollo, /api se redirige al backend: mismo origen, así la cookie de sesión funciona sin CORS.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
