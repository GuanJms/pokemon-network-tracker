import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';

// Clear persisted UI state on full page load to ensure fresh WebSocket/data.
try {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!navEntry || navEntry.type === 'navigate' || navEntry.type === 'reload') {
    sessionStorage.clear();
    // silently ask backend to reset agents so UI and server start in sync
    fetch(import.meta.env.VITE_API_BASE || 'http://localhost:3000' + '/reset/system').catch(() => {});
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
