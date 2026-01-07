import React from 'react';
import { useAppState } from '../../state/store';
import './MoveInfoBox.css';

export function MoveInfoBox() {
  const { currentBlunder, username } = useAppState();

  if (!currentBlunder) {
    return (
      <div className="move-info-box">
        <div className="move-info-empty">No blunder selected</div>
      </div>
    );
  }

  const { game } = currentBlunder;

  // Parse result to get individual scores
  const parseResult = (result: string): { whiteScore: string; blackScore: string } => {
    if (result.includes('-')) {
      const parts = result.split('-');
      return {
        whiteScore: parts[0],
        blackScore: parts[1]
      };
    }
    // Fallback for unexpected formats
    return { whiteScore: result, blackScore: '' };
  };

  // Determine game type from time control
  const getGameTypeEmoji = (timeControl: string | null): string => {
    if (!timeControl) return '❓';
    
    try {
      // Parse time control (format: "600+0" or similar)
      const baseTime = parseInt(timeControl.split('+')[0]);
      if (baseTime >= 600) {
        return '🕐'; // Rapid
      } else if (baseTime >= 180) {
        return '⚡'; // Blitz
      } else {
        return '❓'; // Bullet or unknown
      }
    } catch {
      return '❓';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const { whiteScore, blackScore } = parseResult(game.result);
  const gameTypeEmoji = getGameTypeEmoji(game.time_control);

  // Determine if white/black player is the user
  const isWhitePlayer = username && game.white_player.toLowerCase() === username.toLowerCase();
  const isBlackPlayer = username && game.black_player.toLowerCase() === username.toLowerCase();

  // Determine border color class based on game result and if this is the player
  const getPlayerBorderClass = (isWhite: boolean, isPlayer: boolean): string => {
    if (!isPlayer) {
      return ''; // Opponent - no border
    }
    
    // This is the player - determine outcome
    if (game.result === '1/2-1/2') {
      return 'border-draw'; // Draw - white border
    }
    if (game.result === '1-0') {
      return isWhite 
        ? 'border-win' // White won
        : 'border-loss'; // Black lost
    }
    if (game.result === '0-1') {
      return isWhite 
        ? 'border-loss' // White lost
        : 'border-win'; // Black won
    }
    return 'border-draw'; // Default to white for unknown results
  };

  const whiteBorderClass = getPlayerBorderClass(true, isWhitePlayer);
  const blackBorderClass = getPlayerBorderClass(false, isBlackPlayer);

  // Get game URL
  const getGameUrl = () => {
    if (!username) return null;
    const gameId = game.id;
    return `https://www.chess.com/game/live/${gameId}?username=${encodeURIComponent(username)}`;
  };

  const gameUrl = getGameUrl();

  return (
    <div className="move-info-box">
      {/* Score Display with Player Names and ELOs */}
      <div className="move-info-players">
        <div className={`move-info-player move-info-player-white ${whiteBorderClass}`}>
          <div className={`move-info-score-value ${whiteBorderClass}`}>{whiteScore}</div>
          <div className={`move-info-player-name ${whiteBorderClass}`}>
            {game.white_player}
          </div>
          <div className="move-info-player-elo">{game.white_elo || 'N/A'}</div>
        </div>
        <div className="move-info-score-separator">-</div>
        <div className={`move-info-player ${blackBorderClass}`}>
          <div className={`move-info-score-value ${blackBorderClass}`}>{blackScore}</div>
          <div className={`move-info-player-name ${blackBorderClass}`}>
            {game.black_player}
          </div>
          <div className="move-info-player-elo">{game.black_elo || 'N/A'}</div>
        </div>
      </div>

      {/* Game Info Pane - Centered with Link Button */}
      <div className="move-info-game-details-wrapper">
        <div className="move-info-game-details">
          <div className="move-info-game-emoji">{gameTypeEmoji}</div>
          <div className="move-info-game-meta">
            <div className="move-info-date">{formatDate(game.played_at)}</div>
            <div className="move-info-move-number">Move {currentBlunder.move_number}</div>
          </div>
        </div>
        {gameUrl && (
          <a
            href={gameUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="game-link-button"
            title="View game on Chess.com"
          >
            🔗
          </a>
        )}
      </div>
    </div>
  );
}

