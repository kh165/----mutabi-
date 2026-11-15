import { getMessaging, getToken, deleteToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { app, db } from '../firebase.js';

const TOKEN_COLLECTION = 'fcmTokens';
const LOCAL_TOKEN_KEY = 'mutabi_fcm_token';
async function tokenHash(token) { const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)); return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join(''); }
export async function registerFcmToken(user, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  if (!user?.uid || typeof Notification === 'undefined' || Notification.permission !== 'granted') return null;
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY || !(await isSupported())) return null;
  const messaging = getMessaging(app);
  const registration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, serviceWorkerRegistration: registration });
  if (!token) return null;
  const tokenHashValue = await tokenHash(token);
  await setDoc(doc(db, 'users', user.uid, TOKEN_COLLECTION, tokenHashValue), { token, platform: navigator.platform || 'web', timezone, userAgent: navigator.userAgent, updatedAt: serverTimestamp() }, { merge: true });
  try { localStorage.setItem(LOCAL_TOKEN_KEY, token); } catch {}
  return { token, tokenHash: tokenHashValue };
}
export async function revokeFcmToken(user, token) {
  if (!user?.uid) return;
  let activeToken = token;
  if (!activeToken) {
    try { activeToken = localStorage.getItem(LOCAL_TOKEN_KEY); } catch {}
  }
  if (activeToken) {
    await deleteDoc(doc(db, 'users', user.uid, TOKEN_COLLECTION, await tokenHash(activeToken)));
  }
  if (await isSupported()) await deleteToken(getMessaging(app));
  try { localStorage.removeItem(LOCAL_TOKEN_KEY); } catch {}
}
export async function listenForForegroundMessages(handler) { if (await isSupported()) return onMessage(getMessaging(app), handler); return () => {}; }
