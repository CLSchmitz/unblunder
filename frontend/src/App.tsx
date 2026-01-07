import React, { useState } from 'react';
import { AppProvider, useAppState } from './state/store';
import { LeftPanel } from './components/Layout/LeftPanel';
import { CenterPanel } from './components/Layout/CenterPanel';
import { RightPanel } from './components/Layout/RightPanel';
import { SettingsPane } from './components/Settings/SettingsPane';
import './App.css';

function AppContent() {
  const { analysisError } = useAppState();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="app-container">
      <LeftPanel />
      <CenterPanel />
      <RightPanel />
      <button
        className="settings-gear-button"
        onClick={() => setIsSettingsOpen(true)}
        aria-label="Open settings"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
        </svg>
      </button>
      <SettingsPane
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
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

