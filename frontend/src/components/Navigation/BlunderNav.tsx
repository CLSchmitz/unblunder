import React from 'react';
import { Chess } from 'chess.js';
import { useAppState } from '../../state/store';

export function BlunderNav() {
  const { blunders, currentBlunderIndex, goToNextBlunder, goToPreviousBlunder, goToFirstBlunder, goToLastBlunder, goToRandomBlunder, replayBlunder, playerAttemptedMove, currentBlunder, incrementHint, hintStep } = useAppState();

  const isFirst = currentBlunderIndex === 0;
  const isLast = currentBlunderIndex === blunders.length - 1;
  const hasMove = playerAttemptedMove !== null;

  // Determine if player played the best move
  const movesMatch = (fen: string, move1San: string, move2San: string): boolean => {
    try {
      const game1 = new Chess(fen);
      const game2 = new Chess(fen);
      
      const move1 = game1.move(move1San);
      const move2 = game2.move(move2San);
      
      if (!move1 || !move2) {
        return false;
      }
      
      return move1.from === move2.from && move1.to === move2.to;
    } catch (e) {
      const normalize = (move: string) => move.replace(/[+#=x]/g, '').trim().toLowerCase();
      return normalize(move1San) === normalize(move2San);
    }
  };

  const isBestMove = currentBlunder && playerAttemptedMove
    ? movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.best_move)
    : false;

  // Determine the adaptive button behavior
  const showNextButton = hasMove && isBestMove;
  const showReplayButton = hasMove && !isBestMove;
  const isAdaptiveButtonDisabled = !hasMove || (showNextButton && isLast);

  return (
    <div className="info-box">
      <div className="nav-buttons">
        <button
          className="nav-button"
          onClick={goToFirstBlunder}
          disabled={isFirst}
          title="First"
        >
          ⏮
        </button>
        <button
          className="nav-button"
          onClick={goToPreviousBlunder}
          disabled={isFirst}
          title="Previous"
        >
          ◀
        </button>
        <button
          className="nav-button"
          onClick={goToRandomBlunder}
          disabled={blunders.length <= 1}
          title="Random"
        >
          🔀
        </button>
        <button
          className="nav-button"
          onClick={replayBlunder}
          disabled={!hasMove}
          title="Replay"
        >
          🔄
        </button>
        <button
          className="nav-button"
          onClick={goToNextBlunder}
          disabled={isLast || blunders.length === 0}
          title="Next"
        >
          ▶
        </button>
        <button
          className="nav-button"
          onClick={goToLastBlunder}
          disabled={isLast || blunders.length === 0}
          title="Last"
        >
          ⏭
        </button>
        <button
          className="nav-button"
          onClick={incrementHint}
          disabled={!currentBlunder || playerAttemptedMove !== null || hintStep >= 2}
          title="Hint"
        >
          💡
        </button>
        <button
          className="nav-button nav-button-adaptive"
          onClick={showNextButton ? goToNextBlunder : replayBlunder}
          disabled={isAdaptiveButtonDisabled}
          title={showNextButton ? 'Next' : showReplayButton ? 'Replay' : ''}
        >
          {showNextButton ? '▶' : showReplayButton ? '🔄' : ''}
        </button>
      </div>
      <div className="nav-position">
        {blunders.length === 0 ? 'No blunders loaded' : `${currentBlunderIndex + 1} of ${blunders.length}`}
      </div>
    </div>
  );
}

