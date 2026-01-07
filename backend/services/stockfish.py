import subprocess
import chess
import chess.engine
import logging
from django.conf import settings
import os
from concurrent.futures import ThreadPoolExecutor, Future
from typing import Optional, Callable
import threading

# Set up logging
logger = logging.getLogger(__name__)


class StockfishService:
    """Wrapper service for Stockfish engine."""
    
    def __init__(self, path=None, depth=15):
        self.path = path or settings.STOCKFISH_PATH
        self.depth = depth
        self._engine = None
        
        # Validate Stockfish on initialization
        logger.info(f"Initializing StockfishService with path: {self.path}")
        self._validate_stockfish()
    
    def _validate_stockfish(self):
        """
        Validate that Stockfish executable exists and is working.
        Raises an exception if validation fails.
        """
        # Check if file exists
        if not os.path.exists(self.path):
            error_msg = f"Stockfish executable not found at path: {self.path}"
            logger.error(error_msg)
            raise FileNotFoundError(error_msg)
        
        # Check if it's a file (not a directory)
        if not os.path.isfile(self.path):
            error_msg = f"Stockfish path is not a file: {self.path}"
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        # Check if it's executable (on Unix-like systems)
        if os.name != 'nt' and not os.access(self.path, os.X_OK):
            error_msg = f"Stockfish executable is not executable: {self.path}"
            logger.error(error_msg)
            raise PermissionError(error_msg)
        
        # Try to actually start and ping Stockfish
        logger.debug(f"Testing Stockfish executable at: {self.path}")
        test_engine = None
        try:
            test_engine = chess.engine.SimpleEngine.popen_uci(self.path)
            
            # Try to get engine info to verify it's working
            try:
                info = test_engine.ping()
                logger.debug("Stockfish ping successful")
            except Exception as e:
                logger.warning(f"Stockfish ping failed: {e}, but continuing...")
            
            # Try a simple evaluation to ensure it's actually functional
            test_board = chess.Board()
            try:
                result = test_engine.play(test_board, chess.engine.Limit(time=0.1))
                if result.move is None:
                    raise ValueError("Stockfish returned None for best move")
                logger.debug(f"Stockfish test successful - returned move: {result.move}")
            except Exception as e:
                error_msg = f"Stockfish executable exists but failed to evaluate a position: {str(e)}"
                logger.error(error_msg)
                if test_engine:
                    test_engine.quit()
                raise RuntimeError(error_msg) from e
            
            logger.info("Stockfish validation successful")
            
        except chess.engine.EngineTerminatedError as e:
            error_msg = f"Stockfish engine terminated unexpectedly: {str(e)}"
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e
        except OSError as e:
            error_msg = f"Failed to start Stockfish executable at {self.path}: {str(e)}. Check that the path is correct and the file is executable."
            logger.error(error_msg)
            raise RuntimeError(error_msg) from e
        except Exception as e:
            error_msg = f"Unexpected error validating Stockfish at {self.path}: {str(e)}"
            logger.error(error_msg)
            if test_engine:
                try:
                    test_engine.quit()
                except:
                    pass
            raise RuntimeError(error_msg) from e
        finally:
            # Close test engine if we opened one
            if test_engine:
                try:
                    test_engine.quit()
                except:
                    pass
    
    def _get_engine(self):
        """Get or create Stockfish engine instance."""
        if self._engine is None:
            logger.debug("Creating new Stockfish engine instance")
            self._engine = chess.engine.SimpleEngine.popen_uci(self.path)
            logger.debug("Stockfish engine instance created")
        return self._engine
    
    def close(self):
        """Close the engine."""
        if self._engine:
            self._engine.quit()
            self._engine = None
    
    def evaluate_position(self, fen: str, depth: int = None) -> float:
        """
        Evaluate a position and return evaluation in centipawns.
        Positive = white is better, negative = black is better.
        """
        depth = depth or self.depth
        board = chess.Board(fen)
        engine = self._get_engine()
        
        info = engine.analyse(board, chess.engine.Limit(depth=depth))
        score = info['score'].white()
        
        # Convert to centipawns
        if score.is_mate():
            # Mate scores: convert to large centipawn value
            mate_in = score.mate()
            if mate_in > 0:
                return 10000  # White mates
            else:
                return -10000  # Black mates
        else:
            return score.score()  # Already in centipawns
    
    def get_best_move(self, fen: str, depth: int = None) -> tuple:
        """
        Get best move for a position.
        Returns (best_move_san, continuation_info)
        """
        depth = depth or self.depth
        board = chess.Board(fen)
        engine = self._get_engine()
        
        result = engine.play(board, chess.engine.Limit(depth=depth))
        best_move = result.move
        
        # Convert to SAN notation
        best_move_san = board.san(best_move)
        
        # Get continuation
        board.push(best_move)
        continuation_info = {
            'fen_after': board.fen(),
            'move_san': best_move_san,
        }
        board.pop()
        
        return best_move_san, continuation_info
    
    def get_continuation(self, fen: str, num_moves: int = 5, depth: int = None) -> list:
        """
        Get continuation line from a position.
        Returns list of moves in SAN notation.
        """
        depth = depth or self.depth
        board = chess.Board(fen)
        engine = self._get_engine()
        
        continuation = []
        current_board = board.copy()
        
        for _ in range(num_moves):
            if current_board.is_game_over():
                break
            
            result = engine.play(current_board, chess.engine.Limit(depth=depth))
            move = result.move
            move_san = current_board.san(move)
            continuation.append(move_san)
            current_board.push(move)
        
        return continuation


class StockfishPool:
    """
    Manages a pool of Stockfish instances for parallel game analysis.
    Uses ThreadPoolExecutor to run multiple analyses concurrently.
    """
    
    def __init__(self, pool_size: Optional[int] = None, depth: int = 15, path: Optional[str] = None):
        """
        Initialize the Stockfish pool.
        
        Args:
            pool_size: Number of parallel Stockfish instances (defaults to settings.STOCKFISH_POOL_SIZE)
            depth: Analysis depth for Stockfish
            path: Path to Stockfish executable (defaults to settings.STOCKFISH_PATH)
        """
        default_pool_size = getattr(settings, 'STOCKFISH_POOL_SIZE', 4)
        self.pool_size = pool_size or default_pool_size
        # Ensure minimum of 4 instances for batch analysis
        if self.pool_size < 4:
            logger.warning(f"pool_size {self.pool_size} is less than 4, increasing to 4 for batch analysis performance")
            self.pool_size = 4
        self.depth = depth
        self.path = path or settings.STOCKFISH_PATH
        self._executor: Optional[ThreadPoolExecutor] = None
        self._stockfish_instances = {}  # Thread ID -> StockfishService
        self._lock = threading.Lock()
        
        logger.info(f"Initializing StockfishPool with pool_size={self.pool_size}, depth={self.depth}")
        
        # Initialize the thread pool
        self._executor = ThreadPoolExecutor(max_workers=self.pool_size, thread_name_prefix="StockfishWorker")
        logger.info(f"StockfishPool initialized with {self.pool_size} workers")
    
    def _get_stockfish_for_thread(self) -> StockfishService:
        """
        Get or create a StockfishService instance for the current thread.
        Each worker thread gets its own Stockfish instance.
        """
        thread_id = threading.get_ident()
        
        with self._lock:
            if thread_id not in self._stockfish_instances:
                logger.info(f"Creating new StockfishService instance for thread {thread_id}")
                stockfish = StockfishService(path=self.path, depth=self.depth)
                self._stockfish_instances[thread_id] = stockfish
                logger.info(f"StockfishService instance created for thread {thread_id} (total instances: {len(self._stockfish_instances)})")
            else:
                logger.debug(f"Reusing existing StockfishService for thread {thread_id}")
            return self._stockfish_instances[thread_id]
    
    def submit_analysis(self, analyze_func: Callable, *args, **kwargs) -> Future:
        """
        Submit a game analysis task to the pool.
        
        Args:
            analyze_func: Function to call for analysis (should accept StockfishService as first arg after game)
            *args: Positional arguments for analyze_func
            **kwargs: Keyword arguments for analyze_func
        
        Returns:
            Future object representing the analysis task
        """
        def worker(*args, **kwargs):
            """Worker function that gets a Stockfish instance and runs analysis."""
            thread_id = threading.get_ident()
            logger.info(f"Worker thread {thread_id} starting analysis task")
            stockfish = self._get_stockfish_for_thread()
            logger.debug(f"Worker thread {thread_id} obtained Stockfish instance, starting analysis")
            try:
                result = analyze_func(*args, stockfish=stockfish, **kwargs)
                logger.info(f"Worker thread {thread_id} completed analysis task")
                return result
            except Exception as e:
                logger.error(f"Worker thread {thread_id} encountered error during analysis: {type(e).__name__}: {str(e)}")
                raise
        
        if self._executor is None:
            raise RuntimeError("StockfishPool has been closed")
        
        logger.info(f"Submitting analysis task to pool")
        future = self._executor.submit(worker, *args, **kwargs)
        logger.info(f"Analysis task submitted successfully, future created")
        return future
    
    def close(self):
        """Close all Stockfish instances and shutdown the thread pool."""
        logger.info(f"Closing StockfishPool (active instances: {len(self._stockfish_instances)})")
        
        # Shutdown executor (waits for pending tasks)
        if self._executor:
            logger.info("Shutting down ThreadPoolExecutor and waiting for pending tasks")
            self._executor.shutdown(wait=True)
            self._executor = None
            logger.info("ThreadPoolExecutor shutdown complete")
        
        # Close all Stockfish instances
        with self._lock:
            logger.info(f"Closing {len(self._stockfish_instances)} StockfishService instances")
            for thread_id, stockfish in self._stockfish_instances.items():
                try:
                    logger.info(f"Closing StockfishService for thread {thread_id}")
                    stockfish.close()
                except Exception as e:
                    logger.warning(f"Error closing StockfishService for thread {thread_id}: {e}")
            self._stockfish_instances.clear()
        
        logger.info("StockfishPool closed successfully")
    
    def __enter__(self):
        """Context manager entry."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - ensures cleanup."""
        self.close()
        return False

