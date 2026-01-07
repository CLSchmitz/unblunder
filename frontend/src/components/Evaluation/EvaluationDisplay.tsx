import React from 'react';
import './EvaluationDisplay.css';

interface EvaluationDisplayProps {
  bestMoveEvaluation: number | null;
  blunderEvaluation: number | null;
  playerMoveEvaluation: number | null;
  isEvaluating: boolean;
  showBlunderAfterGame?: boolean;
  showEvaluationsPaneDuringGame?: boolean;
  showBestBlunderDuringPlay?: boolean;
  playerAttemptedMove: string | null;
}

function formatEvaluation(evaluation: number | null): string {
  if (evaluation === null) return '—';
  
  // Format with sign and 1 decimal place
  const sign = evaluation >= 0 ? '+' : '';
  return `${sign}${evaluation.toFixed(1)}`;
}

export function EvaluationDisplay({
  bestMoveEvaluation,
  blunderEvaluation,
  playerMoveEvaluation,
  isEvaluating,
  showBlunderAfterGame = true,
  showEvaluationsPaneDuringGame = true,
  showBestBlunderDuringPlay = false,
  playerAttemptedMove,
}: EvaluationDisplayProps) {
  // If evaluations pane is off, grey it out and show dashes
  const isDisabled = !showEvaluationsPaneDuringGame;
  
  const isAfterMove = playerAttemptedMove !== null;
  
  // Determine when to show best/blunder values:
  // - During play: show if showEvaluationsPaneDuringGame AND showBestBlunderDuringPlay are both ON
  // - After play: show if showEvaluationsPaneDuringGame AND showBlunderAfterGame are both ON
  const shouldShowBestAndBlunder = showEvaluationsPaneDuringGame && (
    isAfterMove ? showBlunderAfterGame : showBestBlunderDuringPlay
  );
  const shouldShowPlayerMove = showEvaluationsPaneDuringGame;

  return (
    <div className={`evaluation-display ${isDisabled ? 'evaluation-display-disabled' : ''}`}>
      <h3 className="evaluation-display-title">Evaluations</h3>
      <div className="evaluation-list">
        <div className="evaluation-item evaluation-best">
          <div className="evaluation-label">Best Move</div>
          <div className="evaluation-value">
            {shouldShowBestAndBlunder && bestMoveEvaluation !== null ? formatEvaluation(bestMoveEvaluation) : '—'}
          </div>
        </div>
        <div className="evaluation-item evaluation-player">
          <div className="evaluation-label">Your Move</div>
          <div className="evaluation-value">
            {shouldShowPlayerMove && isEvaluating ? (
              <span className="evaluation-loading">Calculating...</span>
            ) : shouldShowPlayerMove ? (
              formatEvaluation(playerMoveEvaluation)
            ) : (
              '—'
            )}
          </div>
        </div>
        <div className="evaluation-item evaluation-blunder">
          <div className="evaluation-label">Blunder</div>
          <div className="evaluation-value">
            {shouldShowBestAndBlunder && blunderEvaluation !== null ? formatEvaluation(blunderEvaluation) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

