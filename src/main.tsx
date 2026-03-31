import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { PinProvider } from './contexts/PinContext.tsx';
import { ThemeProvider } from './contexts/ThemeContext.tsx';
import { EntitiesProvider } from './contexts/EntitiesContext.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <EntitiesProvider>
            <PinProvider>
              <App />
            </PinProvider>
          </EntitiesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
