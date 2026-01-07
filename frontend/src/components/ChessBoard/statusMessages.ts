/**
 * Status message types for move outcomes
 */
export type StatusMessageType = 
  | 'best_move'
  | 'blunder_move'
  | 'worse_than_blunder'
  | 'better_than_blunder'
  | 'neither'
  | 'turn_indicator';

export interface StatusMessage {
  type: StatusMessageType;
  text: string;
  color: string;
  className: string;
  showIcon: boolean;
}

/**
 * Determines the status message based on move comparisons and evaluations
 */
export function getStatusMessage(
  isBestMove: boolean,
  isBlunderMove: boolean,
  playerMoveEvaluation: number | null,
  blunderEvaluation: number | null,
  isWhiteToMove: boolean
): StatusMessage {
  // Best move takes priority
  if (isBestMove) {
    return {
      type: 'best_move',
      text: 'You played the best move!',
      color: '#4caf50', // Green
      className: 'outcome-indicator outcome-best',
      showIcon: false,
    };
  }

  // Blunder move
  if (isBlunderMove) {
    return {
      type: 'blunder_move',
      text: 'You played the blunder move.',
      color: '#f44336', // Red
      className: 'outcome-indicator outcome-blunder',
      showIcon: false,
    };
  }

  // Compare evaluations if available
  if (playerMoveEvaluation !== null && blunderEvaluation !== null) {
    if (playerMoveEvaluation < blunderEvaluation) {
      return {
        type: 'worse_than_blunder',
        text: 'Your move is worse than the blunder.',
        color: '#f44336', // Red
        className: 'outcome-indicator outcome-worse',
        showIcon: false,
      };
    } else if (playerMoveEvaluation > blunderEvaluation) {
      return {
        type: 'better_than_blunder',
        text: 'Your move is better than the blunder, but not the best move.',
        color: '#ff9800', // Orange
        className: 'outcome-indicator outcome-better',
        showIcon: false,
      };
    }
  }

  // Default: neither best nor blunder
  return {
    type: 'neither',
    text: 'You played neither the best move nor the blunder.',
    color: '#4682B4', // Steel blue
    className: 'outcome-indicator outcome-neither',
    showIcon: false,
  };
}

/**
 * Gets the turn indicator message
 */
export function getTurnIndicatorMessage(isWhiteToMove: boolean): StatusMessage {
  return {
    type: 'turn_indicator',
    text: isWhiteToMove ? 'White to move' : 'Black to move',
    color: isWhiteToMove ? '#000000' : '#ffffff',
    className: `turn-indicator ${isWhiteToMove ? 'white-turn' : 'black-turn'}`,
    showIcon: true,
  };
}

