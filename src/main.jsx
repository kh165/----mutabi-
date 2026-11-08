import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Register Service Worker for offline PWA installation & 0ms offline booting
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration:', err);
    });
  });
}

createRoot(document.getElementById('root')).render(<App />);
