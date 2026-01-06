import React, { useState } from 'react';
import { useAppState } from '../../state/store';
import { api } from '../../api/client';
import '../Layout/LeftPanel.css';

export function LeftPanel() {
  const { username, setUsername, setAnalyzing, setAnalysisError, setBlunders, isAnalyzing } = useAppState();
  const [inputUsername, setInputUsername] = useState('');

  const handleFindBlunders = async () => {
    if (!inputUsername.trim()) {
      return;
    }

    setUsername(inputUsername.trim());
    setAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await api.analyze({
        username: inputUsername.trim(),
        blunder_params: {
          min_eval_delta: 200,
          depth: 15,
        },
      });
      setBlunders(response.blunders);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze games');
    } finally {
      setAnalyzing(false);
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
    </div>
  );
}

