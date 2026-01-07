import React from 'react';
import { useAppState } from '../../state/store';
import './SettingsPane.css';

interface SettingsPaneProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPane({ isOpen, onClose }: SettingsPaneProps) {
  const {
    showEvalBarDuringGame,
    showEvaluationsPaneDuringGame,
    showBlunderAfterGame,
    showBestBlunderDuringPlay,
    setShowEvalBarDuringGame,
    setShowEvaluationsPaneDuringGame,
    setShowBlunderAfterGame,
    setShowBestBlunderDuringPlay,
  } = useAppState();

  if (!isOpen) return null;

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-pane">
        <div className="settings-pane-header">
          <h2>Settings</h2>
          <button className="settings-close-button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="settings-pane-content">
          <div className="settings-item">
            <label className="settings-label">
              <span>Show Eval Bar</span>
              <input
                type="checkbox"
                checked={showEvalBarDuringGame}
                onChange={(e) => setShowEvalBarDuringGame(e.target.checked)}
                className="settings-toggle"
              />
            </label>
          </div>
          <div className="settings-item">
            <label className="settings-label">
              <span>Show Eval Pane</span>
              <input
                type="checkbox"
                checked={showEvaluationsPaneDuringGame}
                onChange={(e) => setShowEvaluationsPaneDuringGame(e.target.checked)}
                className="settings-toggle"
              />
            </label>
          </div>
          <div className="settings-item">
            <label className="settings-label">
              <span>Show Solution After Every Move</span>
              <input
                type="checkbox"
                checked={showBlunderAfterGame}
                onChange={(e) => setShowBlunderAfterGame(e.target.checked)}
                className="settings-toggle"
              />
            </label>
          </div>
          <div className="settings-item">
            <label className="settings-label">
              <span>Show Best Move/Blunder During Play</span>
              <input
                type="checkbox"
                checked={showBestBlunderDuringPlay}
                onChange={(e) => setShowBestBlunderDuringPlay(e.target.checked)}
                className="settings-toggle"
              />
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

