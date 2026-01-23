import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Test2D from './pages/Test2D.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Test2D />
  </StrictMode>
);
