import React, { useState } from 'react';
import './EvalBar.css';

/**
 * Formats evaluation value for display (same as EvaluationDisplay)
 */
function formatEvaluation(evaluation: number | null | undefined): string {
  if (evaluation === null || evaluation === undefined) return '—';
  
  // Format with sign and 1 decimal place
  const sign = evaluation >= 0 ? '+' : '';
  return `${sign}${evaluation.toFixed(1)}`;
}

interface EvalBarProps {
  /**
   * Evaluation in centipawns (positive = player winning, negative = player losing)
   * This determines where the split between player and opponent colors is
   */
  evaluation?: number;
  /**
   * Player's color ('white' or 'black')
   */
  playerColor: 'white' | 'black';
  /**
   * Evaluation after best move (for green indicator bar)
   */
  bestMoveEvaluation?: number;
  /**
   * Evaluation after blunder move (for red indicator bar)
   */
  blunderEvaluation?: number;
  /**
   * Evaluation after player's custom move (for blue indicator bar)
   */
  playerMoveEvaluation?: number;
  /**
   * Whether to show indicator bars (only when showing outcome)
   */
  showIndicators?: boolean;
  /**
   * Whether the player made the best move (makes green bar tall with glow)
   */
  isBestMove?: boolean;
  /**
   * Whether the player made the blunder move (makes red bar tall with glow)
   */
  isBlunderMove?: boolean;
  /**
   * Whether the player's move is worse than the blunder (makes player indicator deeper red)
   */
  isWorseThanBlunder?: boolean;
  /**
   * Whether the eval bar is disabled (greyed out but still visible)
   */
  disabled?: boolean;
}

/**
 * Converts evaluation (centipawns) to a fill percentage using exponential scale
 * Similar to chess.com's eval bar
 * 
 * @param evaluationCentipawns Evaluation in centipawns
 * @returns Fill percentage (0-100) where 50% = even position
 */
function evaluationToFillPercentage(evaluationCentipawns: number): number {
  // Chess.com uses an exponential scale
  // For small advantages, the bar moves slightly
  // For large advantages, the bar moves more dramatically
  
  // Clamp evaluation to reasonable bounds (±1000 centipawns = ±10 pawns)
  const clampedEvaluation = Math.max(-1000, Math.min(1000, evaluationCentipawns));
  
  // Use exponential function: sign(evaluation) * (1 - exp(-|evaluation|/scale))
  // This gives a smooth curve that's more sensitive to larger advantages
  const scale = 300; // Adjust this to control sensitivity
  const sign = clampedEvaluation >= 0 ? 1 : -1;
  const absEvaluation = Math.abs(clampedEvaluation);
  
  // Exponential mapping: 0 -> 0, large values -> approaching 1
  const normalized = sign * (1 - Math.exp(-absEvaluation / scale));
  
  // Convert to percentage: -1 -> 0%, 0 -> 50%, 1 -> 100%
  // When player is losing (negative evaluation), fillPercentage < 50% (more opponent color at top)
  // When player is winning (positive evaluation), fillPercentage > 50% (more player color at bottom)
  // When even (0 evaluation), fillPercentage = 50% (equal colors)
  return 50 + (normalized * 50);
}

export function EvalBar({ 
  evaluation = 0, 
  playerColor,
  bestMoveEvaluation,
  blunderEvaluation,
  playerMoveEvaluation,
  showIndicators = false,
  isBestMove = false,
  isBlunderMove = false,
  isWorseThanBlunder = false,
  disabled = false
}: EvalBarProps) {
  const [hoveredIndicator, setHoveredIndicator] = useState<'best' | 'blunder' | 'player' | null>(null);
  const fillPercentage = evaluationToFillPercentage(evaluation);
  
  // Determine colors based on player
  const playerColorHex = playerColor === 'white' ? '#ffffff' : '#000000';
  const opponentColorHex = playerColor === 'white' ? '#000000' : '#ffffff';
  
  // Calculate indicator positions (from top of bar, in percentage)
  // When showing indicators, the eval bar is positioned at playerMoveEvaluation,
  // so the blue bar should be at the split (100 - fillPercentage from top)
  const bestMovePosition = bestMoveEvaluation !== undefined
    ? 100 - evaluationToFillPercentage(bestMoveEvaluation) // Convert to position from top
    : undefined;
  const blunderPosition = blunderEvaluation !== undefined
    ? 100 - evaluationToFillPercentage(blunderEvaluation) // Convert to position from top
    : undefined;
  const playerMovePosition = showIndicators && playerMoveEvaluation !== undefined
    ? 100 - fillPercentage // Position from top, at the split
    : playerMoveEvaluation !== undefined
    ? 100 - evaluationToFillPercentage(playerMoveEvaluation) // Convert to position from top
    : undefined;
  
  // The bar fills from bottom (player) to top (opponent)
  // When fillPercentage is low (< 50%), player is losing (more opponent color visible)
  // When fillPercentage is high (> 50%), player is winning (more player color visible)
  
  return (
    <div className="eval-bar-container">
      <div className={`eval-bar ${disabled ? 'eval-bar-disabled' : ''}`}>
        {/* Opponent color (top) */}
        <div 
          className="eval-bar-fill eval-bar-opponent"
          style={{
            height: `${100 - fillPercentage}%`,
            backgroundColor: opponentColorHex,
            borderRadius: '4px 4px 0 0',
            overflow: 'hidden',
          }}
        />
        {/* Player color (bottom) */}
        <div 
          className="eval-bar-fill eval-bar-player"
          style={{
            height: `${fillPercentage}%`,
            backgroundColor: playerColorHex,
            borderRadius: '0 0 4px 4px',
            overflow: 'hidden',
          }}
        />
        
        {/* Horizontal indicator bars */}
        {showIndicators && (
          <>
            {/* Green bar for best move eval */}
            {bestMovePosition !== undefined && (
              <div
                className={`eval-indicator eval-indicator-best ${isBestMove ? 'eval-indicator-highlighted' : ''}`}
                style={{
                  top: `${bestMovePosition}%`,
                }}
                onMouseEnter={() => setHoveredIndicator('best')}
                onMouseLeave={() => setHoveredIndicator(null)}
              >
                {hoveredIndicator === 'best' && (
                  <div className="eval-tooltip eval-tooltip-best">
                    <div className="eval-tooltip-label">Best Move</div>
                    <div className="eval-tooltip-value">
                      {formatEvaluation(bestMoveEvaluation)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Red bar for blunder eval */}
            {blunderPosition !== undefined && (
              <div
                className={`eval-indicator eval-indicator-blunder ${isBlunderMove ? 'eval-indicator-highlighted' : ''}`}
                style={{
                  top: `${blunderPosition}%`,
                }}
                onMouseEnter={() => setHoveredIndicator('blunder')}
                onMouseLeave={() => setHoveredIndicator(null)}
              >
                {hoveredIndicator === 'blunder' && (
                  <div className="eval-tooltip eval-tooltip-blunder">
                    <div className="eval-tooltip-label">Blunder</div>
                    <div className="eval-tooltip-value">
                      {formatEvaluation(blunderEvaluation)}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Blue bar for player's custom move eval - only show if not best or blunder */}
            {playerMovePosition !== undefined && !isBestMove && !isBlunderMove && (
              <div
                className={`eval-indicator eval-indicator-player ${isWorseThanBlunder ? 'eval-indicator-worse-than-blunder' : ''}`}
                style={{
                  top: `${playerMovePosition}%`,
                }}
                onMouseEnter={() => setHoveredIndicator('player')}
                onMouseLeave={() => setHoveredIndicator(null)}
              >
                {hoveredIndicator === 'player' && (
                  <div className={`eval-tooltip eval-tooltip-player ${isWorseThanBlunder ? 'eval-tooltip-worse-than-blunder' : ''}`}>
                    <div className="eval-tooltip-label">Your Move</div>
                    <div className="eval-tooltip-value">
                      {formatEvaluation(playerMoveEvaluation)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

