import './lib/apiClient';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SectionErrorBoundary fallbackTitle="SomLuul — qalad ayaa dhacay">
      <App />
    </SectionErrorBoundary>
  </StrictMode>,
);
