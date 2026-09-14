import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import './styles/variables.css';
import './styles/theme.css';
import './styles/reset.css';
import './styles/global.css';
import './styles/animations.css';

import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Register Service Worker for PWA Offline & Native App Experience
if ('serviceWorker' in navigator && process.env.NODE_ENV !== 'test') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.log('⚡ [Divvy] PWA Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('⚠️ [Divvy] Service Worker registration skipped/failed:', err);
      });
  });
}

