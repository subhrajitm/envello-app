import React from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

import { StoreProvider } from './context/StoreContext';

import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <div className="app">
          <Dashboard />
        </div>
      </StoreProvider>
    </ThemeProvider>
  );
}

export default App;