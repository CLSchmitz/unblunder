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
  isBestMove?: boolean;
  currentBlunder?: { fen_before: string; best_move: string; actual_move: string } | null;
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
  isBestMove = false,
  currentBlunder,
}: EvaluationDisplayProps) {
  // If evaluations pane is off, grey it out and show dashes
  const isDisabled = !showEvaluationsPaneDuringGame;
  
  const isAfterMove = playerAttemptedMove !== null;
  
  // Determine when to show best/blunder values:
  // - During play: show if showEvaluationsPaneDuringGame AND showBestBlunderDuringPlay are both ON
  // - After play: 
  //   * If showBlunderAfterGame is ON: show both best and blunder (original behavior)
  //   * If showBlunderAfterGame is OFF: always show blunder eval, and show best move eval if player played correctly
  let shouldShowBlunder = false;
  let shouldShowBestMove = false;
  
  if (!isAfterMove) {
    // Before move: show if showEvaluationsPaneDuringGame AND showBestBlunderDuringPlay are both ON
    shouldShowBestMove = showEvaluationsPaneDuringGame && showBestBlunderDuringPlay;
    shouldShowBlunder = showEvaluationsPaneDuringGame && showBestBlunderDuringPlay;
  } else {
    // After move
    if (showBlunderAfterGame) {
      // Original behavior: show both if setting is ON
      shouldShowBestMove = showEvaluationsPaneDuringGame;
      shouldShowBlunder = showEvaluationsPaneDuringGame;
    } else {
      // New behavior when setting is OFF:
      // Always show blunder eval after a move
      // Show best move eval if player played the correct move
      shouldShowBlunder = showEvaluationsPaneDuringGame;
      shouldShowBestMove = showEvaluationsPaneDuringGame && isBestMove;
    }
  }
  
  const shouldShowPlayerMove = showEvaluationsPaneDuringGame;

  return (
    <div className={`evaluation-display ${isDisabled ? 'evaluation-display-disabled' : ''}`}>
      <h3 className="evaluation-display-title">Evaluations</h3>
      <div className="evaluation-list">
        <div className="evaluation-item evaluation-best">
          <div className="evaluation-label">Best Move</div>
          <div className="evaluation-value">
            {shouldShowBestMove && bestMoveEvaluation !== null ? formatEvaluation(bestMoveEvaluation) : '—'}
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
            {shouldShowBlunder && blunderEvaluation !== null ? formatEvaluation(blunderEvaluation) : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}

