import {registerRoute as workbox_routing_registerRoute} from '/app/applet/node_modules/workbox-routing/registerRoute.mjs';
import {ExpirationPlugin as workbox_expiration_ExpirationPlugin} from '/app/applet/node_modules/workbox-expiration/ExpirationPlugin.mjs';
import {CacheableResponsePlugin as workbox_cacheable_response_CacheableResponsePlugin} from '/app/applet/node_modules/workbox-cacheable-response/CacheableResponsePlugin.mjs';
import {CacheFirst as workbox_strategies_CacheFirst} from '/app/applet/node_modules/workbox-strategies/CacheFirst.mjs';
import {clientsClaim as workbox_core_clientsClaim} from '/app/applet/node_modules/workbox-core/clientsClaim.mjs';
import {precacheAndRoute as workbox_precaching_precacheAndRoute} from '/app/applet/node_modules/workbox-precaching/precacheAndRoute.mjs';
import {cleanupOutdatedCaches as workbox_precaching_cleanupOutdatedCaches} from '/app/applet/node_modules/workbox-precaching/cleanupOutdatedCaches.mjs';
import {NavigationRoute as workbox_routing_NavigationRoute} from '/app/applet/node_modules/workbox-routing/NavigationRoute.mjs';
import {createHandlerBoundToURL as workbox_precaching_createHandlerBoundToURL} from '/app/applet/node_modules/workbox-precaching/createHandlerBoundToURL.mjs';/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */




self.skipWaiting();
workbox_core_clientsClaim();
/**
 * The precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
workbox_precaching_precacheAndRoute([
  {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  },
  {
    "url": "pwa-maskable-512x512.png",
    "revision": "578014b46c4a87fb1d3f2a651b073d3b"
  },
  {
    "url": "pwa-512x512.png",
    "revision": "7ca97c51b9a74ced60e15b4580ab1ad1"
  },
  {
    "url": "pwa-192x192.png",
    "revision": "7149e703285c2ea86a3ac35f5e2cb01e"
  },
  {
    "url": "notification-handler.js",
    "revision": "9f1fdacde4085005613d1fa4ad30a349"
  },
  {
    "url": "logo.png",
    "revision": "b8b667827771bc1984a91da353277d2d"
  },
  {
    "url": "logo-mark.png",
    "revision": "7ca97c51b9a74ced60e15b4580ab1ad1"
  },
  {
    "url": "index.html",
    "revision": "878c7f5c8f3027071f6f7cd0c2160345"
  },
  {
    "url": "favicon.ico",
    "revision": "745a300240167e852161af38a61916fe"
  },
  {
    "url": "favicon-48x48.png",
    "revision": "626c87350d14f0372c38ab86277f05fa"
  },
  {
    "url": "favicon-32x32.png",
    "revision": "577cd144e51555a43b3cb4cc4bf5b031"
  },
  {
    "url": "favicon-16x16.png",
    "revision": "3f3fbd61433f916676e8728bd68f12a9"
  },
  {
    "url": "apple-touch-icon.png",
    "revision": "0a2d0698ed71e97865cafc0e12f4c921"
  },
  {
    "url": "icons/icon-maskable-512.png",
    "revision": "578014b46c4a87fb1d3f2a651b073d3b"
  },
  {
    "url": "icons/icon-512.png",
    "revision": "7ca97c51b9a74ced60e15b4580ab1ad1"
  },
  {
    "url": "icons/icon-192.png",
    "revision": "7149e703285c2ea86a3ac35f5e2cb01e"
  },
  {
    "url": "fonts/OFL-Amiri.txt",
    "revision": "62c7eb6e52370931494e85e6b2ca3222"
  },
  {
    "url": "assets/index-DJCyxFzf.js",
    "revision": null
  },
  {
    "url": "assets/index-Bi4VDXny.css",
    "revision": null
  },
  {
    "url": "assets/aistudio/pwa-maskable-512x512_23d19c57.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/pwa-512x512_b922c4fe.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/pwa-192x192_e1a4283f.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/image_bf94ac52.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/image_ac7e2913.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/image_a77c206e.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/image_862cf0fe.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/image_506b42da.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/favicon-48x48_7f797495.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/favicon-32x32_f908dbb4.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/favicon-16x16_44a54932.png",
    "revision": null
  },
  {
    "url": "assets/aistudio/apple-touch-icon_90497c65.png",
    "revision": null
  },
  {
    "url": "apple-touch-icon.png",
    "revision": "0a2d0698ed71e97865cafc0e12f4c921"
  },
  {
    "url": "favicon-16x16.png",
    "revision": "3f3fbd61433f916676e8728bd68f12a9"
  },
  {
    "url": "favicon-32x32.png",
    "revision": "577cd144e51555a43b3cb4cc4bf5b031"
  },
  {
    "url": "favicon-48x48.png",
    "revision": "626c87350d14f0372c38ab86277f05fa"
  },
  {
    "url": "favicon.ico",
    "revision": "745a300240167e852161af38a61916fe"
  },
  {
    "url": "pwa-192x192.png",
    "revision": "7149e703285c2ea86a3ac35f5e2cb01e"
  },
  {
    "url": "pwa-512x512.png",
    "revision": "7ca97c51b9a74ced60e15b4580ab1ad1"
  },
  {
    "url": "pwa-maskable-512x512.png",
    "revision": "578014b46c4a87fb1d3f2a651b073d3b"
  },
  {
    "url": "manifest.webmanifest",
    "revision": "f2592510092d135784025c4c05a9e575"
  }
], {});
workbox_precaching_cleanupOutdatedCaches();workbox_routing_registerRoute(new workbox_routing_NavigationRoute(workbox_precaching_createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/__/],}));
workbox_routing_registerRoute(/^https:\/\/files\.quran\.app\/hafs\/madani\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-madani-pages-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 610, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/www\.mp3quran\.net\/api\/quran_pages_svg\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-svg-pages-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 610, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/api\.alquran\.cloud\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-cloud-api-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/api\.quran\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-com-api-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/cdn\.islamic\.network\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"islamic-network-cdn-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 15552000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/(?:www\.)?everyayah\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"everyayah-audio-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 15552000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"google-fonts-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"gstatic-fonts-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');


