import React from 'react';
import { MoveInfoBox } from '../MoveInfo/MoveInfoBox';
import { BlunderNav } from '../Navigation/BlunderNav';
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
  } = useAppState();

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
      />
      <BlunderNav />
    </div>
  );
}

