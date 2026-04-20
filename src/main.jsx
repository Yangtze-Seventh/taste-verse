import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

// Intentionally NOT using <React.StrictMode> — the ported imperative
// engine (3D graph, login particles, DOM listeners) is not idempotent
// and would double-initialise under StrictMode's dev-time remount.
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
