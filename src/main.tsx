import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Lo?i b? t?t c? c�c class bo tr�n (rounded, rounded-lg, rounded-xl, rounded-full, ...) ?? to�n b? giao di?n v? vu�ng g�c.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
