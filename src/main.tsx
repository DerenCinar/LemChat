import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import './index.css';

// Only attach the web manifest over HTTP(S); ChromeOS file:// blocks manifest fetches via CORS.
if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = './manifest.webmanifest';
  document.head.appendChild(manifestLink);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
