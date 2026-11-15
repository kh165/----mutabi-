import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.jsx';
import './index.css';

// خطوط محلية (تتخزن في الـ precache تلقائياً) بدل Google Fonts
import '@fontsource/cairo/arabic-400.css';
import '@fontsource/cairo/arabic-600.css';
import '@fontsource/cairo/arabic-700.css';
import '@fontsource/cairo/arabic-800.css';
import '@fontsource/cairo/arabic-900.css';
import '@fontsource/cairo/latin-400.css';
import '@fontsource/cairo/latin-700.css';
import '@fontsource/amiri-quran/arabic-400.css';
import '@fontsource/amiri/arabic-400.css';
import '@fontsource/amiri/arabic-700.css';
import '@fontsource/scheherazade-new/arabic-400.css';
import '@fontsource/scheherazade-new/arabic-700.css';
import '@fontsource/noto-naskh-arabic/arabic-400.css';
import '@fontsource/noto-naskh-arabic/arabic-700.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // In dev / preview mode, unregister any service workers so browser gets fresh files directly from Vite dev server
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let unregistered = false;
      for (const reg of registrations) {
        reg.unregister();
        unregistered = true;
      }
      if (unregistered && !sessionStorage.getItem('sw_cleaned_v2')) {
        sessionStorage.setItem('sw_cleaned_v2', 'true');
        window.location.reload();
      }
    });

    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.includes('workbox') || key.includes('precache') || key.includes('dev-sw')) {
            caches.delete(key);
          }
        }
      });
    }
  } else {
    let updateSW;
    updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        window.dispatchEvent(new CustomEvent('mutabi:pwa-update', {
          detail: { updateSW },
        }));
      },
    });
  }
}

createRoot(document.getElementById('root')).render(<App />);