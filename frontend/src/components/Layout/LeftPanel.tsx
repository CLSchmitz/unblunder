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
  } = useAppState();
  const [inputUsername, setInputUsername] = useState('');
  const [maxGames, setMaxGames] = useState(50);

  const handleFindBlunders = async () => {
    if (!inputUsername.trim()) {
      return;
    }

    setUsername(inputUsername.trim());
    setAnalyzing(true);
    setAnalysisError(null);
    setBlunders([]); // Clear previous blunders
    setAnalysisProgress({ gamesDiscovered: 0, gamesAnalyzed: 0, maxGames }); // Initialize progress

    try {
      await api.analyzeStream(
        {
          username: inputUsername.trim(),
          max_games: maxGames,
          blunder_params: {
            min_eval_delta: 200,
            depth: 15,
          },
        },
        {
          onProgress: (gamesDiscovered, gamesAnalyzed, maxGames) => {
            setAnalysisProgress({ gamesDiscovered, gamesAnalyzed, maxGames });
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

      <div className="input-group">
        <label htmlFor="maxGames">Max Games</label>
        <input
          id="maxGames"
          type="number"
          min="1"
          max="200"
          value={maxGames}
          onChange={(e) => setMaxGames(Math.max(1, Math.min(200, parseInt(e.target.value) || 50)))}
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

      <div style={{ marginTop: '12px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '4px',
          fontSize: '12px',
          color: '#666'
        }}>
          <span>{isAnalyzing ? 'Finding and analyzing games...' : 'Ready'}</span>
          <span>
            {analysisProgress 
              ? `${analysisProgress.gamesAnalyzed} / ${analysisProgress.maxGames}`
              : '- / -'
            }
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#666',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* White bar for discovered games */}
          {analysisProgress && (
            <div style={{
              width: `${(analysisProgress.gamesDiscovered / analysisProgress.maxGames) * 100}%`,
              height: '100%',
              backgroundColor: '#fff',
              transition: 'width 0.3s ease',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 1
            }} />
          )}
          {/* Green bar for analyzed games */}
          {analysisProgress && analysisProgress.gamesAnalyzed > 0 && (
            <div style={{
              width: `${(analysisProgress.gamesAnalyzed / analysisProgress.maxGames) * 100}%`,
              height: '100%',
              backgroundColor: '#4CAF50',
              transition: 'width 0.3s ease',
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 2
            }} />
          )}
        </div>
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

