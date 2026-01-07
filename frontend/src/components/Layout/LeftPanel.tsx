import React, { useState } from 'react';
import { useAppState } from '../../state/store';
import { api } from '../../api/client';
import '../Layout/LeftPanel.css';

export function LeftPanel() {
  const { 
    username, 
    setUsername, 
    setAnalyzing, 
    setAnalysisError, 
    setBlunders, 
    appendBlunder,
    setAnalysisProgress,
    analysisProgress,
    isAnalyzing,
    showEvalBarDuringGame,
    showEvaluationsPaneDuringGame,
    showBlunderAfterGame,
    showBestBlunderDuringPlay,
    setShowEvalBarDuringGame,
    setShowEvaluationsPaneDuringGame,
    setShowBlunderAfterGame,
    setShowBestBlunderDuringPlay,
  } = useAppState();
  const [inputUsername, setInputUsername] = useState('');

  const handleFindBlunders = async () => {
    if (!inputUsername.trim()) {
      return;
    }

    setUsername(inputUsername.trim());
    setAnalyzing(true);
    setAnalysisError(null);
    setBlunders([]); // Clear previous blunders
    setAnalysisProgress(null); // Reset progress

    try {
      await api.analyzeStream(
        {
          username: inputUsername.trim(),
          blunder_params: {
            min_eval_delta: 200,
            depth: 15,
          },
        },
        {
          onProgress: (gamesAnalyzed, totalGames) => {
            setAnalysisProgress({ gamesAnalyzed, totalGames });
          },
          onBlunder: (blunder) => {
            appendBlunder(blunder);
          },
          onComplete: () => {
            setAnalyzing(false);
            setAnalysisProgress(null);
          },
          onError: (error) => {
            setAnalysisError(error);
            setAnalyzing(false);
            setAnalysisProgress(null);
          },
        }
      );
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze games');
      setAnalyzing(false);
      setAnalysisProgress(null);
    }
  };

  const handleDevBlunders = async () => {
    setUsername('DevPlayer');
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await api.getDevBlunders();
      setBlunders(response.blunders);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Failed to load dev blunders');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="left-panel">
      <div className="input-group">
        <label htmlFor="username">Chess.com Username</label>
        <input
          id="username"
          type="text"
          value={inputUsername}
          onChange={(e) => setInputUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleFindBlunders()}
          placeholder="Enter username"
          disabled={isAnalyzing}
        />
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          className="button button-primary"
          onClick={handleFindBlunders}
          disabled={isAnalyzing || !inputUsername.trim()}
        >
          {isAnalyzing ? 'Analyzing...' : 'Find Blunders'}
        </button>
        <button
          className="button button-primary"
          onClick={handleDevBlunders}
          disabled={isAnalyzing}
          style={{ backgroundColor: '#6c757d' }}
        >
          {isAnalyzing ? 'Loading...' : 'Dev'}
        </button>
      </div>

      {isAnalyzing && analysisProgress && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            <span>Analyzing games...</span>
            <span>{analysisProgress.gamesAnalyzed} / {analysisProgress.totalGames}</span>
          </div>
          <div style={{
            width: '100%',
            height: '8px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(analysisProgress.gamesAnalyzed / analysisProgress.totalGames) * 100}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>
      )}

      <div className="filter-section filter-disabled">
        <h3>Filters (Coming Soon)</h3>
        <div className="input-group">
          <label>Game Type</label>
          <select disabled>
            <option>All</option>
          </select>
        </div>
        <div className="input-group">
          <label>Time Control</label>
          <select disabled>
            <option>All</option>
          </select>
        </div>
      </div>

      <div className="filter-section filter-disabled">
        <h3>Blunder Definition (Coming Soon)</h3>
        <div className="input-group">
          <label>Min Eval Delta</label>
          <input type="number" disabled value="200" />
        </div>
      </div>

      <div className="filter-section settings-section">
        <h3>Settings</h3>
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
  );
}

