import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: [
          'favicon.ico',
          'favicon-16x16.png',
          'favicon-32x32.png',
          'favicon-48x48.png',
          'apple-touch-icon.png',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'مُتَابِع - متابعة العبادات والأنشطة اليومية',
          short_name: 'مُتَابِع',
          description: 'منصة إسلامية متكاملة لمتابعة العبادات اليومية، حفظ وقراءة القرآن الكريم، والصلوات الخمس.',
          theme_color: '#10b981',
          background_color: '#090d16',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 30 * 1024 * 1024, // 30MB for full scripture & audio assets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json,txt}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/__/],
          runtimeCaching: [
            {
              // King Fahd Complex Madinah Mushaf scanned pages (files.quran.app) - CacheFirst for 100% offline reading
              urlPattern: /^https:\/\/files\.quran\.app\/hafs\/madani\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-madani-pages-cache',
                expiration: {
                  maxEntries: 610,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // MP3Quran SVG Quran pages mirror - CacheFirst for offline vector reading
              urlPattern: /^https:\/\/www\.mp3quran\.net\/api\/quran_pages_svg\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-svg-pages-cache',
                expiration: {
                  maxEntries: 610,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Quran API (alquran.cloud) - CacheFirst for 100% offline Holy Quran reading
              urlPattern: /^https:\/\/api\.alquran\.cloud\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-cloud-api-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Quran.com API v4 - Secondary scripture mirror
              urlPattern: /^https:\/\/api\.quran\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-com-api-cache',
                expiration: {
                  maxEntries: 300,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // Islamic Network CDN (Recitations, Quranic calligraphy & Audio)
              urlPattern: /^https:\/\/cdn\.islamic\.network\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'islamic-network-cdn-cache',
                expiration: {
                  maxEntries: 120,
                  maxAgeSeconds: 60 * 60 * 24 * 180,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              // EveryAyah Audio recitations
              urlPattern: /^https:\/\/(?:www\.)?everyayah\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'everyayah-audio-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 180,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
