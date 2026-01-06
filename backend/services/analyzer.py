import chess
import chess.pgn
import logging
from io import StringIO
from typing import List, Dict, Optional
from django.utils import timezone
from core.models import Game, Blunder
from services.stockfish import StockfishService

# Set up logging
logger = logging.getLogger(__name__)


def detect_blunders(moves: List, player_color: str, stockfish: StockfishService, 
                   blunder_params: Dict) -> List[Dict]:
    """
    Detect blunders in a sequence of moves.
    
    Args:
        moves: List of (move_san, fen_before, fen_after, move_number, time_taken) tuples
        player_color: 'white' or 'black'
        stockfish: StockfishService instance
        blunder_params: Dict with 'min_eval_delta' and 'depth'
    
    Returns:
        List of blunder dictionaries
    """
    min_eval_delta = blunder_params.get('min_eval_delta', 200)
    depth = blunder_params.get('depth', 15)
    
    logger.debug(f"detect_blunders: {len(moves)} moves, min_eval_delta={min_eval_delta}, depth={depth}, color={player_color}")
    
    blunders = []
    
    for i, (move_san, fen_before, fen_after, move_number, time_taken) in enumerate(moves):
        logger.debug(f"Analyzing move {i+1}/{len(moves)}: move_number={move_number}, move={move_san}")
        
        try:
            # Evaluate position before move
            logger.debug(f"Evaluating position before move {move_number}")
            eval_before = stockfish.evaluate_position(fen_before, depth)
            logger.debug(f"Eval before: {eval_before} centipawns")
            
            # Adjust for player color perspective
            # If player is black, flip the evaluation
            if player_color == 'black':
                eval_before = -eval_before
                logger.debug(f"Flipped eval for black: {eval_before}")
            
            # Evaluate position after move
            logger.debug(f"Evaluating position after move {move_number}")
            eval_after = stockfish.evaluate_position(fen_after, depth)
            logger.debug(f"Eval after: {eval_after} centipawns")
            
            if player_color == 'black':
                eval_after = -eval_after
                logger.debug(f"Flipped eval for black: {eval_after}")
            
            # Calculate delta (negative = loss)
            eval_delta = eval_after - eval_before
            logger.debug(f"Eval delta for move {move_number}: {eval_delta} centipawns")
            
            # Check if it's a blunder
            if eval_delta <= -min_eval_delta:
                logger.info(f"Blunder detected! Move {move_number} ({move_san}): delta={eval_delta}")
                
                # Get best move
                logger.debug(f"Getting best move for position before move {move_number}")
                best_move_san, continuation_info = stockfish.get_best_move(fen_before, depth)
                logger.debug(f"Best move: {best_move_san}")
                
                # Determine blunder type
                if eval_delta <= -500:
                    blunder_type = 'blunder'
                elif eval_delta <= -300:
                    blunder_type = 'mistake'
                else:
                    blunder_type = 'inaccuracy'
                
                # Calculate severity (0-1 scale)
                severity = min(abs(eval_delta) / 1000.0, 1.0)
                
                blunder_dict = {
                    'move_number': move_number,
                    'fen_before': fen_before,
                    'fen_after': fen_after,
                    'actual_move': move_san,
                    'best_move': best_move_san,
                    'player_color': player_color,
                    'eval_before': eval_before,
                    'eval_after': eval_after,
                    'eval_delta': eval_delta,
                    'blunder_type': blunder_type,
                    'severity': severity,
                    'time_taken': time_taken,
                }
                blunders.append(blunder_dict)
                logger.info(f"Blunder {len(blunders)}: type={blunder_type}, severity={severity:.2f}, delta={eval_delta}")
            else:
                logger.debug(f"Move {move_number} is not a blunder (delta={eval_delta}, threshold={-min_eval_delta})")
                
        except Exception as e:
            logger.warning(f"Error analyzing move {move_number}: {type(e).__name__}: {str(e)}")
            logger.debug(f"Full error for move {move_number}:", exc_info=True)
            continue
    
    logger.debug(f"Blunder detection complete: {len(blunders)} blunders found out of {len(moves)} moves")
    return blunders


def analyze_game(game: Game, username: str, blunder_params: Dict, 
                stockfish: StockfishService) -> List[Blunder]:
    """
    Analyze a single game for blunders.
    
    Args:
        game: Game model instance
        username: Chess.com username to analyze moves for
        blunder_params: Detection parameters
        stockfish: StockfishService instance
    
    Returns:
        List of Blunder model instances (not saved)
    """
    logger.debug(f"analyze_game: Game ID {game.id}, username {username}")
    
    logger.debug("Parsing PGN string")
    pgn_io = StringIO(game.pgn)
    chess_game = chess.pgn.read_game(pgn_io)
    
    if not chess_game:
        logger.warning(f"Failed to parse PGN for game {game.id}")
        return []
    
    logger.debug(f"PGN parsed successfully. White: {chess_game.headers.get('White')}, Black: {chess_game.headers.get('Black')}")
    
    # Determine which color the player played
    player_color = None
    if game.white_player.lower() == username.lower():
        player_color = 'white'
        logger.debug(f"Player {username} is playing as White")
    elif game.black_player.lower() == username.lower():
        player_color = 'black'
        logger.debug(f"Player {username} is playing as Black")
    else:
        # Username doesn't match, skip
        logger.warning(f"Username {username} doesn't match game players (white: {game.white_player}, black: {game.black_player})")
        return []
    
    # Extract moves for the player
    logger.debug("Extracting player moves from game")
    moves = []
    board = chess_game.board()
    move_number = 0
    total_moves = 0
    
    for node in chess_game.mainline():
        move = node.move
        total_moves += 1
        move_number = (total_moves + 1) // 2  # Approximate move number
        
        # Check if this is the player's move
        is_player_move = (board.turn == chess.WHITE and player_color == 'white') or \
                        (board.turn == chess.BLACK and player_color == 'black')
        
        if is_player_move:
            fen_before = board.fen()
            # Get SAN notation BEFORE pushing the move (otherwise the move won't be legal)
            # Use the node's san() method which works with the position before the move
            move_san = board.san(move)
            board.push(move)
            fen_after = board.fen()
            
            # For MVP, we don't parse move times from PGN comments
            time_taken = None
            
            moves.append((move_san, fen_before, fen_after, move_number, time_taken))
            logger.debug(f"Added player move {move_number}: {move_san}")
        else:
            board.push(move)
    
    logger.info(f"Extracted {len(moves)} moves for player {username} from {total_moves} total moves")
    
    # Detect blunders
    logger.debug("Starting blunder detection")
    blunder_data = detect_blunders(moves, player_color, stockfish, blunder_params)
    logger.info(f"Blunder detection complete: found {len(blunder_data)} blunders")
    
    # Create Blunder objects (not saved yet)
    logger.debug("Creating Blunder model instances")
    blunders = []
    for i, blunder_dict in enumerate(blunder_data):
        logger.debug(f"Creating blunder {i+1}/{len(blunder_data)}: move {blunder_dict['move_number']}, delta={blunder_dict['eval_delta']}")
        blunder = Blunder(
            game=game,
            move_number=blunder_dict['move_number'],
            fen_before=blunder_dict['fen_before'],
            fen_after=blunder_dict['fen_after'],
            actual_move=blunder_dict['actual_move'],
            best_move=blunder_dict['best_move'],
            player_color=blunder_dict['player_color'],
            eval_before=blunder_dict['eval_before'],
            eval_after=blunder_dict['eval_after'],
            eval_delta=blunder_dict['eval_delta'],
            blunder_type=blunder_dict['blunder_type'],
            severity=blunder_dict['severity'],
            time_taken=blunder_dict['time_taken'],
            analysis_params=blunder_params,
        )
        blunders.append(blunder)
    
    logger.debug(f"Created {len(blunders)} Blunder instances for game {game.id}")
    return blunders


def analyze_games_batch(games: List[Game], username: str, 
                        blunder_params: Dict) -> List[Blunder]:
    """
    Analyze multiple games automatically for blunders.
    
    Args:
        games: List of Game model instances
        username: Chess.com username
        blunder_params: Detection parameters
    
    Returns:
        List of saved Blunder model instances
    """
    logger.info(f"analyze_games_batch: Starting analysis of {len(games)} games")
    logger.info(f"Analysis params: {blunder_params}")
    
    depth = blunder_params.get('depth', 15)
    logger.info(f"Initializing StockfishService with depth={depth}")
    
    try:
        stockfish = StockfishService(depth=depth)
        logger.info("StockfishService initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize StockfishService: {type(e).__name__}: {str(e)}")
        raise
    
    all_blunders = []
    
    try:
        for i, game in enumerate(games):
            logger.info(f"Analyzing game {i+1}/{len(games)}: Game ID {game.id}")
            logger.debug(f"Game details: white={game.white_player}, black={game.black_player}, result={game.result}")
            
            try:
                logger.debug(f"Calling analyze_game for game {game.id}")
                blunders = analyze_game(game, username, blunder_params, stockfish)
                logger.info(f"Game {game.id} analysis complete: found {len(blunders)} blunders")
                
                # Save blunders
                for j, blunder in enumerate(blunders):
                    logger.debug(f"Saving blunder {j+1}/{len(blunders)} from game {game.id}")
                    blunder.save()
                    all_blunders.append(blunder)
                    logger.debug(f"Blunder {blunder.id} saved: move_number={blunder.move_number}, eval_delta={blunder.eval_delta}")
                
                # Update game analysis status
                logger.debug(f"Updating game {game.id} status to 'completed'")
                game.analysis_status = 'completed'
                game.analyzed_at = timezone.now()
                game.save()
                logger.info(f"Game {game.id} marked as completed")
                
            except Exception as e:
                logger.error(f"Error analyzing game {game.id}: {type(e).__name__}: {str(e)}")
                logger.debug(f"Full error traceback for game {game.id}:", exc_info=True)
                game.analysis_status = 'failed'
                game.save()
                logger.warning(f"Game {game.id} marked as failed")
                continue
    finally:
        logger.info("Closing StockfishService")
        stockfish.close()
        logger.info("StockfishService closed")
    
    logger.info(f"Batch analysis complete: {len(all_blunders)} total blunders found across {len(games)} games")
    return all_blunders

