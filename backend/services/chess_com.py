import sys
import os
import requests
import chess.pgn
import logging
import hashlib
from io import StringIO
from datetime import datetime, timezone as dt_timezone
from typing import List, Dict, Optional
from django.utils import timezone

# Add parent directory to path to import chess_api
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, parent_dir)
from chess_api import get_pgns

from core.models import Game

# Set up logging
logger = logging.getLogger(__name__)


def parse_pgn(pgn_string: str) -> Dict:
    """Parse PGN string and extract game metadata."""
    pgn_io = StringIO(pgn_string)
    game = chess.pgn.read_game(pgn_io)
    
    if not game:
        return {}
    
    headers = game.headers
    
    # Extract Site URL if available (unique identifier for chess.com games)
    site_url = headers.get('Site', '')
    
    # Extract ELOs
    white_elo = None
    black_elo = None
    if 'WhiteElo' in headers:
        try:
            white_elo = int(headers['WhiteElo'])
        except (ValueError, TypeError):
            pass
    if 'BlackElo' in headers:
        try:
            black_elo = int(headers['BlackElo'])
        except (ValueError, TypeError):
            pass
    
    # Parse date (make it timezone-aware for Django)
    played_at = None
    if 'UTCDate' in headers and 'UTCTime' in headers:
        try:
            date_str = f"{headers['UTCDate']} {headers['UTCTime']}"
            # Parse as naive datetime first
            naive_dt = datetime.strptime(date_str, '%Y.%m.%d %H:%M:%S')
            # Make it timezone-aware (UTC) - use standard library timezone
            played_at = naive_dt.replace(tzinfo=dt_timezone.utc)
        except (ValueError, TypeError) as e:
            logger.debug(f"Failed to parse date: {e}")
            pass
    
    # Extract time control
    time_control = headers.get('TimeControl', '')
    
    # Determine game type from time control
    game_type = 'unknown'
    if time_control:
        if '+' in time_control:
            base_time = int(time_control.split('+')[0])
            if base_time >= 600:
                game_type = 'rapid'
            elif base_time >= 180:
                game_type = 'blitz'
            else:
                game_type = 'bullet'
    
    # Extract result
    result = headers.get('Result', '*')
    
    # Extract move times from PGN comments (if available)
    move_times = {}
    node = game
    move_num = 0
    while node:
        if node.comment:
            # Try to extract time from comment (format varies)
            # Common format: [%clk 0:10:30] or similar
            pass  # For MVP, we'll skip detailed move time parsing
        node = node.next()
        move_num += 1
    
    return {
        'white_player': headers.get('White', ''),
        'black_player': headers.get('Black', ''),
        'white_elo': white_elo,
        'black_elo': black_elo,
        'result': result,
        'time_control': time_control,
        'game_type': game_type,
        'played_at': played_at,
        'pgn': pgn_string,
        'site_url': site_url,
    }


def fetch_user_games(username: str, limit: int = 20) -> List[Game]:
    """Fetch games from chess.com and create Game objects."""
    logger.info(f"fetch_user_games called: username={username}, limit={limit}")
    
    # Get PGNs using existing chess_api
    logger.info("Calling get_pgns to fetch PGN data from chess.com")
    try:
        pgns = get_pgns(username, limit=limit)
        logger.info(f"get_pgns returned {len(pgns)} PGNs")
    except Exception as e:
        logger.error(f"Error calling get_pgns: {type(e).__name__}: {str(e)}")
        raise
    
    games = []
    logger.info(f"Processing {len(pgns)} PGNs to create Game objects")
    
    for i, pgn in enumerate(pgns):
        logger.debug(f"Processing PGN {i+1}/{len(pgns)}")
        try:
            logger.debug(f"Parsing PGN {i+1}...")
            metadata = parse_pgn(pgn)
            logger.debug(f"Parsed metadata: white={metadata.get('white_player')}, black={metadata.get('black_player')}")
            
            # Extract played_at before storing in metadata (datetime objects aren't JSON serializable)
            played_at = metadata.pop('played_at', None)
            
            # Extract site_url for unique identification
            site_url = metadata.pop('site_url', '')
            
            # Remove PGN from metadata (we store it separately in the pgn field)
            metadata.pop('pgn', None)
            
            # Generate unique chess_com_id
            # Prefer Site URL if available (chess.com provides unique game URLs)
            if site_url:
                # Extract game ID from URL if it's a chess.com URL
                # Format: https://www.chess.com/game/live/{game_id} or similar
                if 'chess.com/game' in site_url:
                    # Try to extract the game ID from the URL
                    # Remove trailing slash and split
                    clean_url = site_url.rstrip('/')
                    parts = clean_url.split('/')
                    if len(parts) > 0 and parts[-1]:
                        game_id_from_url = parts[-1]
                        chess_com_id = f"chess_com_{game_id_from_url}"
                    else:
                        # Fallback: use hash of URL
                        chess_com_id = f"chess_com_{hashlib.md5(site_url.encode()).hexdigest()[:16]}"
                else:
                    # Not a chess.com URL, use hash
                    chess_com_id = f"site_{hashlib.md5(site_url.encode()).hexdigest()[:16]}"
            else:
                # Fallback: create unique ID from game attributes
                # Use white_player, black_player, date, and time to create a unique hash
                unique_string = f"{metadata.get('white_player', '')}_{metadata.get('black_player', '')}_{played_at or 'unknown'}"
                chess_com_id = f"{username}_{hashlib.md5(unique_string.encode()).hexdigest()[:16]}"
            
            logger.debug(f"Creating/getting game with chess_com_id: {chess_com_id}")
            
            game, created = Game.objects.get_or_create(
                chess_com_id=chess_com_id,  # Unique ID based on Site URL or game attributes
                defaults={
                    'pgn': pgn,
                    'white_player': metadata.get('white_player', ''),
                    'black_player': metadata.get('black_player', ''),
                    'white_elo': metadata.get('white_elo'),
                    'black_elo': metadata.get('black_elo'),
                    'result': metadata.get('result', '*'),
                    'time_control': metadata.get('time_control'),
                    'game_type': metadata.get('game_type'),
                    'played_at': played_at,
                    'metadata': metadata,  # Now safe for JSON serialization
                    'analysis_status': 'pending',
                }
            )
            
            if created:
                logger.debug(f"Created new game {game.id}")
            else:
                logger.debug(f"Retrieved existing game {game.id}")
            
            games.append(game)
            logger.debug(f"Successfully processed game {i+1}")
            
        except Exception as e:
            logger.warning(f"Error processing game {i}: {type(e).__name__}: {str(e)}")
            logger.debug(f"Full error for game {i}:", exc_info=True)
            continue
    
    logger.info(f"Successfully created/retrieved {len(games)} Game objects from {len(pgns)} PGNs")
    return games

