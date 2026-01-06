import React from 'react';
import { Chess } from 'chess.js';
import { useAppState } from '../../state/store';

/**
 * Compares two moves by parsing them from the same FEN position and comparing
 * their from/to squares. This handles variations in SAN notation (captures,
 * checks, disambiguation, etc.)
 */
function movesMatch(fen: string, move1San: string, move2San: string): boolean {
  try {
    // Parse both moves from the same position
    const game1 = new Chess(fen);
    const game2 = new Chess(fen);
    
    const move1 = game1.move(move1San);
    const move2 = game2.move(move2San);
    
    // If either move fails to parse, they don't match
    if (!move1 || !move2) {
      return false;
    }
    
    // Compare from and to squares
    return move1.from === move2.from && move1.to === move2.to;
  } catch (e) {
    // If parsing fails, fall back to string comparison with normalization
    const normalize = (move: string) => move.replace(/[+#=x]/g, '').trim().toLowerCase();
    return normalize(move1San) === normalize(move2San);
  }
}

export function OutcomeBox() {
  const { currentBlunder, playerAttemptedMove } = useAppState();

  if (!currentBlunder) {
    return (
      <div className="info-box">
        <h3>Outcome</h3>
        <p style={{ color: '#999', fontSize: '14px' }}>Load a blunder to see outcome</p>
      </div>
    );
  }

  // Show nothing before a move is played
  if (!playerAttemptedMove) {
    return (
      <div className="info-box">
        <h3>Outcome</h3>
      </div>
    );
  }

  // Determine outcome by comparing the played move with actual_move and best_move
  // Use the FEN before the blunder to parse moves in the same position
  const isBestMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.best_move);
  const isBlunder = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.actual_move);

  let outcomeText: string;
  let outcomeColor: string;

  if (isBestMove) {
    outcomeText = 'You played the best move!';
    outcomeColor = '#4caf50'; // Green
  } else if (isBlunder) {
    outcomeText = 'You played the blunder move.';
    outcomeColor = '#f44336'; // Red
  } else {
    outcomeText = 'You played neither the best move nor the blunder.';
    outcomeColor = '#ff9800'; // Orange
  }

  return (
    <div className="info-box">
      <h3>Outcome</h3>
      <p style={{ 
        marginTop: '10px', 
        fontSize: '16px', 
        fontWeight: '500',
        color: outcomeColor 
      }}>
        {outcomeText}
      </p>
    </div>
  );
}

