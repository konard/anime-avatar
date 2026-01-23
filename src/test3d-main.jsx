import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Test3D from './pages/Test3D.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Test3D />
  </StrictMode>
);
