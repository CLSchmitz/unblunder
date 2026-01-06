export interface Game {
  id: number;
  opponent: string;
  played_at: string | null;
  white_elo: number | null;
  black_elo: number | null;
  result: string;
  time_control: string | null;
  white_player: string;
  black_player: string;
}

export interface Blunder {
  id: number;
  game_id: number;
  game: Game;
  move_number: number;
  fen_before: string;
  fen_after: string;
  actual_move: string;
  best_move: string;
  player_color: 'white' | 'black';
  eval_before: number;
  eval_after: number;
  eval_delta: number;
  blunder_type: string;
  severity: number;
  time_taken: number | null;
}

export interface AnalysisRequest {
  username: string;
  blunder_params?: {
    min_eval_delta?: number;
    depth?: number;
  };
}

export interface AnalysisResponse {
  games_analyzed: number;
  blunders_found: number;
  blunders: Blunder[];
}

export type OutcomeType = 'best_move' | 'was_blunder' | 'neither';

