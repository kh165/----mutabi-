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
    "revision": "3ca0b8505b4bec776b69afdba2768812"
  },
  {
    "url": "/index.html",
    "revision": "0.5jdad37le0o"
  }
], {});
workbox_precaching_cleanupOutdatedCaches();workbox_routing_registerRoute(new workbox_routing_NavigationRoute(workbox_precaching_createHandlerBoundToURL("/index.html"), {
  allowlist: [/^\/$/],  denylist: [/^\/__/],}));
workbox_routing_registerRoute(/^https:\/\/files\.quran\.app\/hafs\/madani\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-madani-pages-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 610, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/www\.mp3quran\.net\/api\/quran_pages_svg\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-svg-pages-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 610, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/api\.alquran\.cloud\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-cloud-api-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/api\.quran\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"quran-com-api-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/cdn\.islamic\.network\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"islamic-network-cdn-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 15552000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/(?:www\.)?everyayah\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"everyayah-audio-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 15552000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"google-fonts-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');
workbox_routing_registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox_strategies_CacheFirst({ "cacheName":"gstatic-fonts-cache", plugins: [new workbox_expiration_ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 31536000 }), new workbox_cacheable_response_CacheableResponsePlugin({ statuses: [ 0, 200 ] })] }), 'GET');


