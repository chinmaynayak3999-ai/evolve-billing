import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        // Don't cache large JS chunks — always fetch fresh from network
        globPatterns: ['**/*.{html,css,ico,svg,png,webp}'],
        runtimeCaching: [
          {
            // JS files: network first, cache as fallback
            urlPattern: /\.js$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'js-cache', expiration: { maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
      },
      manifest: {
        name: 'Evolve Billing',
        short_name: 'Evolve',
        description: 'Billing & Inventory for Evolve Supplement Store',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  base: '/',
})
