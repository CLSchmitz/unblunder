from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import StreamingHttpResponse
import logging
import traceback
import json
from datetime import datetime, timedelta
from core.models import Game, Blunder, PlayerAttempt
from api.serializers import (
    BlunderSerializer, PlayerAttemptSerializer, 
    AnalysisRequestSerializer, AnalysisResponseSerializer,
    EvaluatePositionRequestSerializer, EvaluatePositionResponseSerializer
)
from services.chess_com import fetch_user_games
from services.analyzer import analyze_games_batch, analyze_games_batch_streaming
from services.stockfish import StockfishService

# Set up logging
logger = logging.getLogger(__name__)


def _stream_analysis(games, username, blunder_params, request):
    """
    Generator function that yields Server-Sent Events for streaming analysis results.
    """
    # Store username in request for opponent calculation
    request.username = username
    
    try:
        # Send initial progress
        yield f"data: {json.dumps({'type': 'progress', 'games_analyzed': 0, 'total_games': len(games)})}\n\n"
        
        # Stream analysis results
        for event_type, data in analyze_games_batch_streaming(games, username, blunder_params):
            if event_type == 'progress':
                yield f"data: {json.dumps({'type': 'progress', 'games_analyzed': data['games_analyzed'], 'total_games': data['total_games']})}\n\n"
            elif event_type == 'blunder':
                # Serialize the blunder
                blunder_serializer = BlunderSerializer(data, context={'request': request})
                yield f"data: {json.dumps({'type': 'blunder', 'blunder': blunder_serializer.data})}\n\n"
        
        # Send completion message
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error("=" * 80)
        logger.error("STREAMING ANALYSIS: ERROR OCCURRED")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error("Full traceback:")
        logger.error(error_traceback)
        logger.error("=" * 80)
        yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"


@api_view(['POST'])
def analyze_stream(request):
    """
    Streaming endpoint: Fetch games from chess.com and analyze for blunders progressively.
    Uses Server-Sent Events (SSE) to stream results as they are found.
    POST /api/analyze-stream/
    """
    logger.info("=" * 80)
    logger.info("ANALYZE-STREAM ENDPOINT: Request received")
    logger.info(f"Request data: {request.data}")
    
    # Validate request
    logger.info("Validating request data...")
    serializer = AnalysisRequestSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username = serializer.validated_data['username']
    blunder_params = serializer.validated_data.get('blunder_params', {})
    logger.info(f"Validated username: {username}")
    logger.info(f"Validated blunder_params: {blunder_params}")
    
    # Set defaults
    if 'min_eval_delta' not in blunder_params:
        blunder_params['min_eval_delta'] = 200
        logger.debug(f"Set default min_eval_delta: 200")
    if 'depth' not in blunder_params:
        blunder_params['depth'] = 15
        logger.debug(f"Set default depth: 15")
    
    logger.info(f"Final blunder_params: {blunder_params}")
    
    try:
        # Fetch games
        logger.info("-" * 80)
        logger.info("STEP 1: Fetching games from chess.com")
        logger.info(f"Fetching games for username: {username}, limit: 20")
        games = fetch_user_games(username, limit=20)
        logger.info(f"Successfully fetched {len(games)} games")
        
        if not games:
            logger.warning("No games found for username")
            return Response(
                {'error': 'No games found for this username'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Sort games by most recent first (played_at descending)
        games = sorted(games, key=lambda g: g.played_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        logger.info(f"Games sorted by most recent first: {[g.id for g in games]}")
        
        logger.info("-" * 80)
        logger.info("STEP 2: Starting streaming analysis")
        logger.info(f"Analyzing {len(games)} games with params: {blunder_params}")
        
        # Return streaming response
        response = StreamingHttpResponse(
            _stream_analysis(games, username, blunder_params, request),
            content_type='text/event-stream'
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'  # Disable buffering in nginx
        logger.info("=" * 80)
        logger.info("ANALYZE-STREAM ENDPOINT: Streaming started")
        return response
    
    except Exception as e:
        # Log the full traceback for debugging
        error_traceback = traceback.format_exc()
        logger.error("=" * 80)
        logger.error("ANALYZE-STREAM ENDPOINT: ERROR OCCURRED")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error("Full traceback:")
        logger.error(error_traceback)
        logger.error("=" * 80)
        
        # Return a proper JSON error response
        return Response(
            {'error': str(e), 'detail': f'An error occurred during analysis: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def analyze(request):
    """
    Main endpoint: Fetch games from chess.com and analyze for blunders.
    POST /api/analyze/
    """
    logger.info("=" * 80)
    logger.info("ANALYZE ENDPOINT: Request received")
    logger.info(f"Request data: {request.data}")
    logger.info(f"Request headers: {dict(request.headers)}")
    
    # Validate request
    logger.info("Validating request data...")
    serializer = AnalysisRequestSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    username = serializer.validated_data['username']
    blunder_params = serializer.validated_data.get('blunder_params', {})
    logger.info(f"Validated username: {username}")
    logger.info(f"Validated blunder_params: {blunder_params}")
    
    # Set defaults
    if 'min_eval_delta' not in blunder_params:
        blunder_params['min_eval_delta'] = 200
        logger.debug(f"Set default min_eval_delta: 200")
    if 'depth' not in blunder_params:
        blunder_params['depth'] = 15
        logger.debug(f"Set default depth: 15")
    
    logger.info(f"Final blunder_params: {blunder_params}")
    
    try:
        # Fetch games
        logger.info("-" * 80)
        logger.info("STEP 1: Fetching games from chess.com")
        logger.info(f"Fetching games for username: {username}, limit: 20")
        games = fetch_user_games(username, limit=20)
        logger.info(f"Successfully fetched {len(games)} games")
        
        if not games:
            logger.warning("No games found for username")
            return Response(
                {'error': 'No games found for this username'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Sort games by most recent first (played_at descending)
        games = sorted(games, key=lambda g: g.played_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
        logger.info(f"Games sorted by most recent first: {[g.id for g in games]}")
        
        # Analyze games
        logger.info("-" * 80)
        logger.info("STEP 2: Analyzing games for blunders")
        logger.info(f"Analyzing {len(games)} games with params: {blunder_params}")
        blunders = analyze_games_batch(games, username, blunder_params)
        logger.info(f"Analysis complete. Found {len(blunders)} blunders")
        
        # Store username in request for opponent calculation
        request.username = username
        
        # Serialize response
        logger.info("-" * 80)
        logger.info("STEP 3: Serializing response")
        logger.info(f"Serializing {len(blunders)} blunders")
        blunder_serializer = BlunderSerializer(blunders, many=True, context={'request': request})
        logger.info("Serialization complete")
        
        response_data = {
            'games_analyzed': len(games),
            'blunders_found': len(blunders),
            'blunders': blunder_serializer.data
        }
        
        logger.info(f"Response prepared: {len(response_data['blunders'])} blunders from {response_data['games_analyzed']} games")
        logger.info("=" * 80)
        logger.info("ANALYZE ENDPOINT: Success")
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        # Log the full traceback for debugging
        error_traceback = traceback.format_exc()
        logger.error("=" * 80)
        logger.error("ANALYZE ENDPOINT: ERROR OCCURRED")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error("Full traceback:")
        logger.error(error_traceback)
        logger.error("=" * 80)
        
        # Return a proper JSON error response
        return Response(
            {'error': str(e), 'detail': f'An error occurred during analysis: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def blunder_list(request):
    """
    Get all blunders (with optional filters).
    GET /api/blunders/
    """
    blunders = Blunder.objects.all().select_related('game').order_by('-created_at')
    
    # Apply filters if provided
    game_id = request.query_params.get('game_id')
    if game_id:
        blunders = blunders.filter(game_id=game_id)
    
    player_color = request.query_params.get('player_color')
    if player_color:
        blunders = blunders.filter(player_color=player_color)
    
    serializer = BlunderSerializer(blunders, many=True, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def blunder_detail(request, pk):
    """
    Get specific blunder details.
    GET /api/blunders/{id}/
    """
    blunder = get_object_or_404(Blunder, pk=pk)
    serializer = BlunderSerializer(blunder, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
def blunder_attempt(request, pk):
    """
    Record player's correction attempt.
    POST /api/blunders/{id}/attempt/
    """
    blunder = get_object_or_404(Blunder, pk=pk)
    
    serializer = PlayerAttemptSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Create attempt
    attempt = PlayerAttempt.objects.create(
        blunder=blunder,
        attempted_move=serializer.validated_data['attempted_move'],
        outcome=serializer.validated_data['outcome']
    )
    
    return Response(
        PlayerAttemptSerializer(attempt).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
def dev_validate_move(request):
    """
    Dev endpoint: Validates a chess move (always returns True for now).
    TODO: Replace this with actual move validation using chess engine or library.
    POST /api/dev/validate-move/
    
    Request body:
    {
        "fen": "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        "from": "e2",
        "to": "e4"
    }
    
    Response:
    {
        "isValid": true
    }
    """
    # TODO: Replace this mock implementation with actual move validation
    # This should validate:
    # 1. The move is legal according to chess rules
    # 2. The move is from the correct player's turn (based on FEN)
    # 3. The move doesn't leave the king in check (if applicable)
    # Consider using python-chess library or Stockfish for validation
    
    return Response({'isValid': True}, status=status.HTTP_200_OK)


@api_view(['GET'])
def dev_blunders(request):
    """
    Dev endpoint: Returns 3 obvious blunders for frontend debugging.
    GET /api/dev/blunders/
    """
    # Create 3 dev games and blunders with obvious mistakes
    
    # Blunder 1: Hanging Queen - White moves queen to d4 where black knight can capture
    game1, _ = Game.objects.get_or_create(
        chess_com_id='dev_game_123',
        defaults={
            'pgn': '[Event "Dev Game 1"]\n[White "DevPlayer"]\n[Black "Opponent1"]\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Qd4??',
            'white_player': 'DevPlayer',
            'black_player': 'Opponent1',
            'white_elo': 1500,
            'black_elo': 1520,
            'result': '0-1',
            'time_control': '600+5',
            'played_at': timezone.now() - timedelta(days=1),
        }
    )
    
    blunder1, _ = Blunder.objects.get_or_create(
        game=game1,
        move_number=4,
        defaults={
            'fen_before': 'rnbqkbnr/pppp1ppp/4p3/8/8/5P2/PPPPP1PP/RNBQKBNR w KQkq - 0 2',
            'fen_after': 'rnbqkbnr/pppp1ppp/4p3/8/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
            'actual_move': 'g2g4',
            'best_move': 'e2e4',
            'player_color': 'white',
            'eval_before': 200,
            'eval_after': -800,
            'eval_delta': -1000,
            'blunder_type': 'blunder',
            'severity': 5,
            'time_taken': 5,
        }
    )
    
    # Blunder 2: Checkmate in One - White misses mate and makes a bad move
    game2, _ = Game.objects.get_or_create(
        chess_com_id='dev_game_222',
        defaults={
            'pgn': '[Event "Dev Game 2"]\n[White "DevPlayer"]\n[Black "Opponent2"]\n1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qf3??',
            'white_player': 'DevPlayer',
            'black_player': 'Opponent2',
            'white_elo': 1600,
            'black_elo': 1580,
            'result': '0-1',
            'time_control': '300+3',
            'played_at': timezone.now() - timedelta(days=2),
        }
    )
    
    blunder2, _ = Blunder.objects.get_or_create(
        game=game2,
        move_number=4,
        defaults={
            'fen_before': 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 5 4',
            'fen_after': 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 6 4',
            'actual_move': 'Qf3',
            'best_move': 'Qxf7#',
            'player_color': 'white',
            'eval_before': 2000,
            'eval_after': 100,
            'eval_delta': -1900,
            'blunder_type': 'blunder',
            'severity': 1.0,
            'time_taken': 3,
        }
    )
    
    # Blunder 3: Hanging Rook - White moves rook to a square where it can be captured
    game3, _ = Game.objects.get_or_create(
        chess_com_id='dev_game_3',
        defaults={
            'pgn': '[Event "Dev Game 3"]\n[White "DevPlayer"]\n[Black "Opponent3"]\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. O-O Nf6 5. Rf1??',
            'white_player': 'DevPlayer',
            'black_player': 'Opponent3',
            'white_elo': 1400,
            'black_elo': 1450,
            'result': '0-1',
            'time_control': '600+5',
            'played_at': timezone.now() - timedelta(days=3),
        }
    )
    
    blunder3, _ = Blunder.objects.get_or_create(
        game=game3,
        move_number=5,
        defaults={
            'fen_before': 'r1bqkb1r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 5',
            'fen_after': 'r1bqkb1r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQ1R1K b kq - 5 5',
            'actual_move': 'Rf1',
            'best_move': 'd3',
            'player_color': 'white',
            'eval_before': 150,
            'eval_after': -500,
            'eval_delta': -650,
            'blunder_type': 'blunder',
            'severity': 0.85,
            'time_taken': 8,
        }
    )
    
    # Set username for opponent calculation
    request.username = 'DevPlayer'
    
    # Serialize and return
    blunders = [blunder1, blunder2, blunder3]
    blunder_serializer = BlunderSerializer(blunders, many=True, context={'request': request})
    
    response_data = {
        'games_analyzed': 3,
        'blunders_found': 3,
        'blunders': blunder_serializer.data
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
def evaluate_position(request):
    """
    Evaluate a chess position and return the evaluation.
    POST /api/evaluate-position/
    
    Request body:
    {
        "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        "player_color": "white",
        "depth": 15
    }
    
    Response:
    {
        "evaluation": 25.5
    }
    """
    logger.info("=" * 80)
    logger.info("EVALUATE-POSITION ENDPOINT: Request received")
    logger.info(f"Request data: {request.data}")
    
    # Validate request
    serializer = EvaluatePositionRequestSerializer(data=request.data)
    if not serializer.is_valid():
        logger.error(f"Validation failed: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    fen = serializer.validated_data['fen']
    player_color = serializer.validated_data['player_color']
    depth = serializer.validated_data.get('depth', 15)
    
    logger.info(f"Evaluating position: fen={fen}, player_color={player_color}, depth={depth}")
    
    try:
        # Create Stockfish service instance
        stockfish = StockfishService(depth=depth)
        
        # Evaluate position (from white's perspective)
        eval_white = stockfish.evaluate_position(fen, depth)
        logger.debug(f"Raw evaluation (white perspective): {eval_white} centipawns")
        
        # Adjust for player color perspective
        # If player is black, flip the evaluation
        if player_color == 'black':
            evaluation = -eval_white
            logger.debug(f"Flipped eval for black: {evaluation}")
        else:
            evaluation = eval_white
        
        logger.info(f"Final evaluation (player perspective): {evaluation} centipawns")
        
        # Clean up
        stockfish.close()
        
        response_data = {'evaluation': evaluation}
        logger.info("=" * 80)
        logger.info("EVALUATE-POSITION ENDPOINT: Success")
        return Response(response_data, status=status.HTTP_200_OK)
    
    except Exception as e:
        error_traceback = traceback.format_exc()
        logger.error("=" * 80)
        logger.error("EVALUATE-POSITION ENDPOINT: ERROR OCCURRED")
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Error message: {str(e)}")
        logger.error("Full traceback:")
        logger.error(error_traceback)
        logger.error("=" * 80)
        
        return Response(
            {'error': str(e), 'detail': f'An error occurred during evaluation: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

