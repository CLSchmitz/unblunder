import React, { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useAppState } from '../../state/store';
import { EvalBar } from './EvalBar';
import { api } from '../../api/client';
import { getStatusMessage, getTurnIndicatorMessage } from './statusMessages';
import './BlunderBoard.css';

export function BlunderBoard() {
  const {
    currentBlunder,
    setPlayerAttemptedMove,
    playerAttemptedMove,
    bestMoveEvaluation,
    blunderEvaluation,
    playerMoveEvaluation,
    isEvaluating,
    setBestMoveEvaluation,
    setBlunderEvaluation,
    setPlayerMoveEvaluation,
    setIsEvaluating,
    resetEvaluations,
    showEvalBarDuringGame,
    showBlunderAfterGame,
    showBestBlunderDuringPlay,
    hintStep,
  } = useAppState();
  const [game, setGame] = useState(new Chess());
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [bestMoveTargetSquare, setBestMoveTargetSquare] = useState<string | null>(null);
  const [showBestMoveFlash, setShowBestMoveFlash] = useState(false);
  const [blunderTargetSquare, setBlunderTargetSquare] = useState<string | null>(null);
  const [showBlunderFlash, setShowBlunderFlash] = useState(false);

  useEffect(() => {
    if (currentBlunder) {
      const newGame = new Chess(currentBlunder.fen_before);
      setGame(newGame);
      
      // Set board orientation based on player color
      setBoardOrientation(currentBlunder.player_color);
      
      // Reset attempted move and evaluations when blunder changes
      setPlayerAttemptedMove(null);
      resetEvaluations();
      setBestMoveTargetSquare(null);
      setShowBestMoveFlash(false);
      setBlunderTargetSquare(null);
      setShowBlunderFlash(false);
      // Hint state is reset in the store when blunder changes
      
      // Calculate and set known evaluations
      const estimatedBestMoveEvaluation = currentBlunder.eval_before - currentBlunder.eval_delta;
      setBestMoveEvaluation(estimatedBestMoveEvaluation);
      setBlunderEvaluation(currentBlunder.eval_after);
    } else {
      // Reset to starting position when no blunder
      const newGame = new Chess();
      setGame(newGame);
      setBoardOrientation('white');
      setPlayerAttemptedMove(null);
      resetEvaluations();
      setBestMoveTargetSquare(null);
      setShowBestMoveFlash(false);
      setBlunderTargetSquare(null);
      setShowBlunderFlash(false);
    }
  }, [currentBlunder, setPlayerAttemptedMove, setBestMoveEvaluation, setBlunderEvaluation, resetEvaluations]);

  // Reset board to initial position when playerAttemptedMove becomes null (replay)
  useEffect(() => {
    if (currentBlunder && playerAttemptedMove === null) {
      const newGame = new Chess(currentBlunder.fen_before);
      setGame(newGame);
      setPlayerMoveEvaluation(null);
      setBestMoveTargetSquare(null);
      setShowBestMoveFlash(false);
      setBlunderTargetSquare(null);
      setShowBlunderFlash(false);
    }
  }, [playerAttemptedMove, currentBlunder, setPlayerMoveEvaluation]);

  // Function to compare moves (same logic as OutcomeBox)
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
        
        // Check if this is the best move or blunder move and trigger flash
        if (currentBlunder) {
          const isBestMove = movesMatch(currentBlunder.fen_before, move.san, currentBlunder.best_move);
          const isBlunderMove = movesMatch(currentBlunder.fen_before, move.san, currentBlunder.actual_move);
          
          if (isBestMove) {
            setBestMoveTargetSquare(targetSquare);
            setShowBestMoveFlash(true);
            // Reset flash after animation completes
            setTimeout(() => {
              setShowBestMoveFlash(false);
            }, 1000); // Flash duration matches CSS animation
          }
          
          if (isBlunderMove) {
            setBlunderTargetSquare(targetSquare);
            setShowBlunderFlash(true);
            // Reset flash after animation completes
            setTimeout(() => {
              setShowBlunderFlash(false);
            }, 1000); // Flash duration matches CSS animation
          }
        }
        
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
  // - Before move: show hint highlights if hint is active
  // - After move: highlight player's move (blue), best move (green), blunder move (red)
  const getCustomSquareStyles = () => {
    if (!currentBlunder) {
      return {};
    }

    const styles: Record<string, React.CSSProperties> = {};

    // Before a move: show hint highlights if hint is active
    if (!playerAttemptedMove) {
      if (hintStep > 0) {
        try {
          const best = getMoveSquaresFromSan(currentBlunder.fen_before, currentBlunder.best_move);
          if (best) {
            // On first press (hintStep === 1), highlight from square
            if (hintStep >= 1) {
              styles[best.from] = {
                backgroundColor: 'rgba(255, 255, 0, 0.6)', // Yellow highlight
                boxShadow: 'inset 0 0 20px rgba(255, 255, 0, 0.8)',
              };
            }
            // On second press (hintStep === 2), also highlight to square
            if (hintStep >= 2) {
              styles[best.to] = {
                backgroundColor: 'rgba(255, 255, 0, 0.6)', // Yellow highlight
                boxShadow: 'inset 0 0 20px rgba(255, 255, 0, 0.8)',
              };
            }
          }
        } catch {}
      }
      return styles;
    }

    // Check if the move was correct (best move) or blunder
    const isBestMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.best_move);
    const isBlunderMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.actual_move);
    
    // If it's the best move, show green flash on target square (always show, regardless of settings)
    if (isBestMove && showBestMoveFlash && bestMoveTargetSquare) {
      styles[bestMoveTargetSquare] = {
        animation: 'bestMoveFlash 1s ease-out',
      };
    }
    
    // If it's the blunder move, show red flash on target square (always show, regardless of settings)
    if (isBlunderMove && showBlunderFlash && blunderTargetSquare) {
      styles[blunderTargetSquare] = {
        animation: 'blunderFlash 1s ease-out',
      };
    }
    
    // When player plays the best move: always show solution highlights (both best move and blunder)
    if (isBestMove) {
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
    }
    
    // When showBlunderAfterGame is OFF and player didn't play best move: don't show highlights
    if (!showBlunderAfterGame) {
      return styles;
    }

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
  
  // Evaluate position when player makes a move
  useEffect(() => {
    if (currentBlunder && playerAttemptedMove && game.fen() !== currentBlunder.fen_before) {
      // Check if this is not the blunder move or best move
      const isBlunderMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.actual_move);
      const isBestMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.best_move);
      
      // Only evaluate if it's a custom move (not blunder or best)
      if (!isBlunderMove && !isBestMove) {
        setIsEvaluating(true);
        const currentFen = game.fen();
        api.evaluatePosition({
          fen: currentFen,
          player_color: currentBlunder.player_color,
          depth: 15,
        })
          .then((evaluation) => {
            setPlayerMoveEvaluation(evaluation);
            setIsEvaluating(false);
          })
          .catch((error) => {
            console.error('Error evaluating position:', error);
            setIsEvaluating(false);
          });
      } else {
        // If it's the blunder move, use the known eval_after
        if (isBlunderMove) {
          setPlayerMoveEvaluation(currentBlunder.eval_after);
        } else if (isBestMove) {
          // If it's the best move, estimate the evaluation
          setPlayerMoveEvaluation(currentBlunder.eval_before - currentBlunder.eval_delta);
        }
      }
    } else if (!playerAttemptedMove) {
      setPlayerMoveEvaluation(null);
    }
  }, [playerAttemptedMove, game, currentBlunder, setIsEvaluating, setPlayerMoveEvaluation]);

  // Determine what to show in the indicator
  let indicatorContent = null;

  if (currentBlunder && playerAttemptedMove) {
    // Show "Calculating..." if evaluation is in progress
    if (isEvaluating) {
      indicatorContent = {
        type: 'calculating' as const,
        text: 'Calculating...',
        color: '#4682B4', // Steel blue
        className: 'outcome-indicator outcome-calculating',
        showIcon: false,
      };
    } else {
      // After a move: show outcome using status message system
      const isBestMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.best_move);
      const isBlunderMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.actual_move);
      
      indicatorContent = getStatusMessage(
        isBestMove,
        isBlunderMove,
        playerMoveEvaluation,
        blunderEvaluation,
        isWhiteToMove
      );
    }
  } else {
    // Before a move or no blunder: show whose turn it is
    indicatorContent = getTurnIndicatorMessage(isWhiteToMove);
  }

  // Get player color for eval bar
  const playerColor = currentBlunder?.player_color || 'white';
  
  // Calculate current evaluation based on board state
  let currentEvaluation = 0;
  let showIndicators = false;
  
  if (currentBlunder) {
    if (!playerAttemptedMove) {
      // Before move: if showing best move indicators, position bar at best move evaluation
      // Otherwise use eval_before (current position)
      if (showBestBlunderDuringPlay && bestMoveEvaluation !== null) {
        currentEvaluation = bestMoveEvaluation;
      } else {
        currentEvaluation = currentBlunder.eval_before;
      }
    } else {
      // After move: show outcome with indicators
      showIndicators = true;
      
      // When showing outcome, position the eval bar at the player's move evaluation
      // Use playerMoveEvaluation if available, otherwise fall back to known values
      if (playerMoveEvaluation !== null) {
        currentEvaluation = playerMoveEvaluation;
      } else {
        // Fallback: check if it's a known move
        const isBlunderMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.actual_move);
        const isBestMove = movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.best_move);
        
        if (isBlunderMove) {
          currentEvaluation = currentBlunder.eval_after;
        } else if (isBestMove) {
          currentEvaluation = bestMoveEvaluation || (currentBlunder.eval_before - currentBlunder.eval_delta);
        } else {
          // Unknown move, use eval_before as placeholder
          currentEvaluation = currentBlunder.eval_before;
        }
      }
    }
  }

  return (
    <div className="blunder-board-container">
      {/* Turn indicator / Outcome indicator - always rendered to prevent layout shift */}
      <div 
        className={indicatorContent ? indicatorContent.className : 'turn-indicator'} 
        style={indicatorContent && playerAttemptedMove ? { backgroundColor: indicatorContent.color, color: '#ffffff' } : {}}
      >
        {indicatorContent ? (
          <>
            {indicatorContent.showIcon ? (
              <span className="king-icon">{isWhiteToMove ? '♔' : '♚'}</span>
            ) : (
              <span className="king-icon" style={{ visibility: 'hidden' }}>♔</span>
            )}
            <span className="turn-text">{indicatorContent.text}</span>
          </>
        ) : (
          <>
            <span className="king-icon" style={{ visibility: 'hidden' }}>♔</span>
            <span className="turn-text" style={{ visibility: 'hidden' }}>Placeholder</span>
          </>
        )}
      </div>
      <div className="board-with-eval">
        {(() => {
          const isBestMove = currentBlunder && playerAttemptedMove ? movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.best_move) : false;
          const isBlunderMove = currentBlunder && playerAttemptedMove ? movesMatch(currentBlunder.fen_before, playerAttemptedMove, currentBlunder.actual_move) : false;
          
          // Determine what indicators to show:
          // - Before move: show if showBestBlunderDuringPlay is ON
          // - After move with showBlunderAfterGame ON: show all (original behavior)
          // - After move with showBlunderAfterGame OFF: always show blunder, show best move if player played correctly
          let shouldShowBestMoveIndicator = false;
          let shouldShowBlunderIndicator = false;
          
          if (!playerAttemptedMove) {
            // Before move
            shouldShowBestMoveIndicator = showBestBlunderDuringPlay;
            shouldShowBlunderIndicator = showBestBlunderDuringPlay;
          } else {
            // After move
            if (showBlunderAfterGame) {
              // Original behavior: show all indicators
              shouldShowBestMoveIndicator = true;
              shouldShowBlunderIndicator = true;
            } else {
              // New behavior: always show blunder, show best move if player played correctly
              shouldShowBlunderIndicator = true;
              shouldShowBestMoveIndicator = isBestMove;
            }
          }
          
          return (
            <EvalBar 
              evaluation={currentEvaluation}
              playerColor={playerColor}
              bestMoveEvaluation={
                shouldShowBestMoveIndicator ? (bestMoveEvaluation ?? undefined) : undefined
              }
              blunderEvaluation={
                shouldShowBlunderIndicator ? (blunderEvaluation ?? undefined) : undefined
              }
              playerMoveEvaluation={playerMoveEvaluation ?? undefined}
              showIndicators={
                playerAttemptedMove
                  ? (showIndicators && (showBlunderAfterGame || shouldShowBlunderIndicator || shouldShowBestMoveIndicator))
                  : showBestBlunderDuringPlay
              }
              isBestMove={isBestMove}
              isBlunderMove={isBlunderMove}
              isWorseThanBlunder={indicatorContent?.type === 'worse_than_blunder'}
              disabled={!showEvalBarDuringGame}
            />
          );
        })()}
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
      </div>
    </div>
  );
}

