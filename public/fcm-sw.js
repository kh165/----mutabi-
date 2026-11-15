/* Firebase Messaging background handler. The Firebase web config is public client configuration. */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');
firebase.initializeApp({ apiKey: 'AIzaSyCXpbrbwbLPcScmcADfC4AkilgXzGRkgRc', authDomain: 'mutabi-acb51.firebaseapp.com', projectId: 'mutabi-acb51', storageBucket: 'mutabi-acb51.firebasestorage.app', messagingSenderId: '610797985015', appId: '1:610797985015:web:fa93c803c9c8c18e8407f2' });
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // FCM automatically displays notification payloads in the background. Only
  // data-only messages need an explicit showNotification call here.
  if (payload.notification) return;

  const data = payload.data || {};
  const title = data.title || 'مُتَابِع';
  const options = {
    body: data.body || 'لديك تنبيه جديد',
    icon: '/pwa-192x192.png',
    badge: '/logo-mark.png',
    data: { ...data, url: data.url || '/' },
  };
  return self.registration.showNotification(title, options);
});
