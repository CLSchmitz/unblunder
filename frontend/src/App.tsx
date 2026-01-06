import React from 'react';
import { AppProvider, useAppState } from './state/store';
import { LeftPanel } from './components/Layout/LeftPanel';
import { CenterPanel } from './components/Layout/CenterPanel';
import { RightPanel } from './components/Layout/RightPanel';
import './App.css';

function AppContent() {
  const { analysisError } = useAppState();

  return (
    <div className="app-container">
      <LeftPanel />
      <CenterPanel />
      <RightPanel />
      {analysisError && (
        <div className="error" style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
        }}>
          {analysisError}
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

