import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Lo?i b? t?t c? các class bo tròn (rounded, rounded-lg, rounded-xl, rounded-full, ...) ?? toàn b? giao di?n v? vuông góc.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
