import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const YEAR = 60 * 60 * 24 * 365;

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false, // التسجيل بيتم من main.jsx
        includeAssets: [
          'favicon.ico',
          'favicon-16x16.png',
          'favicon-32x32.png',
          'favicon-48x48.png',
          'apple-touch-icon.png',
          'logo.png',
          'logo-mark.png',
          'fonts/*.ttf',
          'audio/*.mp3',
        ],
        manifest: {
          id: '/',
          name: 'مُتَابِع - منصّة متابعة العبادات والأنشطة اليومية',
          short_name: 'مُتَابِع',
          description: 'منصّة متابعة العبادات اليومية — حفظ وقراءة القرآن الكريم، الصلوات الخمس، التسبيح، وقائمة المهام',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#0f172a',
          theme_color: '#10b981',
          dir: 'rtl',
          lang: 'ar',
          icons: [
            { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          clientsClaim: true,
          skipWaiting: true,
          cleanupOutdatedCaches: true,
          importScripts: ['/notification-handler.js'],
          maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,webmanifest,mp3}'],
          // أي تنقل داخل التطبيق يرجع لـ index.html (ضروري للأوفلاين)
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/__/],
          runtimeCaching: [
            {
              // نصوص القرآن والتفسير (نفس اسم الكاش المستخدم في زر التحميل)
              urlPattern: /^https:\/\/(api\.alquran\.cloud|quranenc\.com|api\.quran\.com)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-text-cache',
                expiration: { maxEntries: 700, maxAgeSeconds: YEAR },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // الأحاديث
              urlPattern: /^https:\/\/(cdn\.jsdelivr\.net\/gh\/fawazahmed0|raw\.githubusercontent\.com\/fawazahmed0)\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'hadith-cache',
                expiration: { maxEntries: 400, maxAgeSeconds: YEAR },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // صور صفحات المصحف
              urlPattern: /^https:\/\/files\.quran\.app\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-pages-cache',
                expiration: { maxEntries: 700, maxAgeSeconds: YEAR },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // تلاوات السور والآيات
              urlPattern: /^https:\/\/cdn\.islamic\.network\/quran\/audio(?:-surah)?\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'quran-audio-cache',
                expiration: { maxEntries: 7000, maxAgeSeconds: YEAR },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // مواقيت الصلاة: الشبكة أولاً ثم آخر نسخة محفوظة
              urlPattern: /^https:\/\/api\.aladhan\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'prayer-times-cache',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 7 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: { enabled: true },
      }),
    ],
    resolve: {
      alias: { '@': path.resolve(__dirname, '.') },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});