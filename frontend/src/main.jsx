import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app.jsx';
import 'bootstrap/dist/css/bootstrap.min.css';
import './app.css';
import { applyGlobalTheme } from './shared/hooks/useTheme';

// Initialize global theme before initial render
applyGlobalTheme();

ReactDOM.createRoot(document.getElementById('app')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

