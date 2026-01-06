import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAppState } from '../../state/store';
import './BlunderBoard.css';

export function BlunderBoard() {
  const { currentBlunder, setPlayerAttemptedMove, playerAttemptedMove } = useAppState();
  const [game, setGame] = useState(new Chess());
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  useEffect(() => {
    if (currentBlunder) {
      const newGame = new Chess(currentBlunder.fen_before);
      setGame(newGame);
      
      // Set board orientation based on player color
      setBoardOrientation(currentBlunder.player_color);
      
      // Reset attempted move when blunder changes
      setPlayerAttemptedMove(null);
    } else {
      // Reset to starting position when no blunder
      const newGame = new Chess();
      setGame(newGame);
      setBoardOrientation('white');
      setPlayerAttemptedMove(null);
    }
  }, [currentBlunder, setPlayerAttemptedMove]);

  // Reset board to initial position when playerAttemptedMove becomes null (replay)
  useEffect(() => {
    if (currentBlunder && playerAttemptedMove === null) {
      const newGame = new Chess(currentBlunder.fen_before);
      setGame(newGame);
    }
  }, [playerAttemptedMove, currentBlunder]);

  const onPieceDrop = (sourceSquare: string, targetSquare: string) => {
    if (!currentBlunder) {
      return false;
    }

    try {
      // Make the move on a copy of the game to avoid mutation issues
      const gameCopy = new Chess(game.fen());
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Always promote to queen for simplicity
      });

      if (move) {
        // Update game state with the new position
        setGame(gameCopy);
        
        // Store the attempted move in SAN notation
        setPlayerAttemptedMove(move.san);
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  };

  // Helpers to robustly derive squares from SAN regardless of side-to-move glitches
  const normalizeSan = (san: string) => san.replace(/[+#]/g, '').trim();
  const toggleTurnInFen = (fen: string) => {
    const parts = fen.split(' ');
    if (parts.length >= 2) {
      parts[1] = parts[1] === 'w' ? 'b' : 'w';
      return parts.join(' ');
    }
    return fen;
  };
  const getMoveSquaresFromSan = (fen: string, san: string): { from: string; to: string } | null => {
    if (!san) return null;
    const tryParsers = (candidateFen: string) => {
      try {
        const temp = new Chess(candidateFen);
        const m = temp.move(san);
        if (m) return { from: m.from, to: m.to };
      } catch {}
      try {
        const temp = new Chess(candidateFen);
        const moves = temp.moves({ verbose: true });
        const target = normalizeSan(san);
        const found = moves.find(mm => normalizeSan(mm.san) === target);
        if (found) return { from: found.from, to: found.to };
      } catch {}
      return null;
    };
    // Try with given FEN, then with toggled side to move
    return tryParsers(fen) || tryParsers(toggleTurnInFen(fen));
  };

  // Highlight squares:
  // - Before move: no highlights
  // - After move: highlight player's move (blue), best move (green), blunder move (red)
  const getCustomSquareStyles = () => {
    if (!currentBlunder) {
      return {};
    }

    // Before a move: show no highlights
    if (!playerAttemptedMove) {
      return {};
    }

    const styles: Record<string, React.CSSProperties> = {};

    // Attempted move (blue)
    try {
      const attempted = getMoveSquaresFromSan(currentBlunder.fen_before, playerAttemptedMove);
      if (attempted) {
        styles[attempted.from] = {
          backgroundColor: 'rgba(70, 130, 180, 0.5)', // steelblue
        };
        styles[attempted.to] = {
          backgroundColor: 'rgba(70, 130, 180, 0.5)',
        };
      }
    } catch {}

    // Best move (green)
    try {
      const best = getMoveSquaresFromSan(currentBlunder.fen_before, currentBlunder.best_move);
      if (best) {
        styles[best.from] = {
          ...styles[best.from],
          backgroundColor: 'rgba(100, 255, 100, 0.4)',
        };
        styles[best.to] = {
          ...styles[best.to],
          backgroundColor: 'rgba(100, 255, 100, 0.4)',
        };
      }
    } catch {}

    // Actual blunder move (red)
    try {
      const actual = getMoveSquaresFromSan(currentBlunder.fen_before, currentBlunder.actual_move);
      if (actual) {
        styles[actual.from] = {
          ...styles[actual.from],
          backgroundColor: 'rgba(255, 100, 100, 0.4)',
        };
        styles[actual.to] = {
          ...styles[actual.to],
          backgroundColor: 'rgba(255, 100, 100, 0.4)',
        };
      }
    } catch {}

    return styles;
  };

  // Determine whose turn it is
  const turn = game.turn(); // 'w' for white, 'b' for black
  const isWhiteToMove = turn === 'w';

  return (
    <div className="blunder-board-container">
      {/* Turn indicator */}
      <div className={`turn-indicator ${isWhiteToMove ? 'white-turn' : 'black-turn'}`}>
        <span className="king-icon">{isWhiteToMove ? '♔' : '♚'}</span>
        <span className="turn-text">{isWhiteToMove ? 'White to move' : 'Black to move'}</span>
      </div>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onPieceDrop}
        boardOrientation={boardOrientation}
        customSquareStyles={getCustomSquareStyles()}
        arePiecesDraggable={!!currentBlunder && !playerAttemptedMove}
        customBoardStyle={{
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(76, 175, 80, 0.2)',
        }}
        customDarkSquareStyle={{ backgroundColor: '#2d4a2d' }}
        customLightSquareStyle={{ backgroundColor: '#8fa68f' }}
      />
      {playerAttemptedMove && (
        <div style={{ 
          marginTop: '10px', 
          textAlign: 'center', 
          color: '#4a9eff',
          fontSize: '14px' 
        }}>
          You played: {playerAttemptedMove}
        </div>
      )}
      {!currentBlunder && (
        <div style={{ 
          marginTop: '10px', 
          textAlign: 'center', 
          color: '#999',
          fontSize: '14px' 
        }}>
          Enter a username and click "Find Blunders" to start
        </div>
      )}
    </div>
  );
}

