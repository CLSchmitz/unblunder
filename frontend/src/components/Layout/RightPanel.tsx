import React from 'react';
import { MoveInfoBox } from '../MoveInfo/MoveInfoBox';
import { EvaluationDisplay } from '../Evaluation/EvaluationDisplay';
import { useAppState } from '../../state/store';

export function RightPanel() {
  const {
    bestMoveEvaluation,
    blunderEvaluation,
    playerMoveEvaluation,
    isEvaluating,
    playerAttemptedMove,
    showEvaluationsPaneDuringGame,
    showBlunderAfterGame,
    showBestBlunderDuringPlay,
    currentBlunder,
  } = useAppState();

  // Determine if player played the best move
  const movesMatch = (fen: string, move1San: string, move2San: string): boolean => {
    try {
      const Chess = require('chess.js').Chess;
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

  return (
    <div className="right-panel">
      <MoveInfoBox />
      <EvaluationDisplay
        bestMoveEvaluation={bestMoveEvaluation}
        blunderEvaluation={blunderEvaluation}
        playerMoveEvaluation={playerMoveEvaluation}
        isEvaluating={isEvaluating}
        showBlunderAfterGame={showBlunderAfterGame}
        showEvaluationsPaneDuringGame={showEvaluationsPaneDuringGame}
        showBestBlunderDuringPlay={showBestBlunderDuringPlay}
        playerAttemptedMove={playerAttemptedMove}
        isBestMove={isBestMove}
        currentBlunder={currentBlunder}
      />
    </div>
  );
}

