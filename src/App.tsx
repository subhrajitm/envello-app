import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

import { StoreProvider } from './context/StoreContext';

function App() {
  return (
    <StoreProvider>
      <div className="app">
        <Dashboard />
      </div>
    </StoreProvider>
  );
}

export default App;