import React from 'react';
import { useAppState } from '../../state/store';

export function MoveInfoBox() {
  const { currentBlunder } = useAppState();

  if (!currentBlunder) {
    return (
      <div className="info-box">
        <h3>Move Info</h3>
        <div className="info-row">
          <span className="info-label">No blunder selected</span>
        </div>
      </div>
    );
  }

  const { game } = currentBlunder;
  const playerElo = currentBlunder.player_color === 'white' 
    ? game.white_elo 
    : game.black_elo;
  const opponentElo = currentBlunder.player_color === 'white' 
    ? game.black_elo 
    : game.white_elo;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="info-box">
      <h3>Move Info</h3>
      <div className="info-row">
        <span className="info-label">Opponent:</span>
        <span className="info-value">{game.opponent}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Date:</span>
        <span className="info-value">{formatDate(game.played_at)}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Your ELO:</span>
        <span className="info-value">{playerElo || 'N/A'}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Opponent ELO:</span>
        <span className="info-value">{opponentElo || 'N/A'}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Result:</span>
        <span className="info-value">{game.result}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Time Control:</span>
        <span className="info-value">{game.time_control || 'N/A'}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Move Number:</span>
        <span className="info-value">{currentBlunder.move_number}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Time Taken:</span>
        <span className="info-value">{formatTime(currentBlunder.time_taken)}</span>
      </div>
      <div className="info-row">
        <span className="info-label">Eval Delta:</span>
        <span className="info-value">{currentBlunder.eval_delta.toFixed(0)} cp</span>
      </div>
    </div>
  );
}

