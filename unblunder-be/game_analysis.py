import chess
import chess.pgn
import chess.engine
import subprocess
import io

def quickstart():

    #game, blunders = quickstart()

    test_pgn = '[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2022.11.12"]\n[Round "-"]\n[White "burgos2012"]\n[Black "chrislschmitz"]\n[Result "1-0"]\n[CurrentPosition "r3r1k1/p2p2Qp/2p3pP/3b2P1/8/6K1/PPN2P2/2B5 b - -"]\n[Timezone "UTC"]\n[ECO "B20"]\n[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Bowdler-Attack"]\n[UTCDate "2022.11.12"]\n[UTCTime "23:30:03"]\n[WhiteElo "1025"]\n[BlackElo "967"]\n[TimeControl "180"]\n[Termination "burgos2012 won by checkmate"]\n[StartTime "23:30:03"]\n[EndDate "2022.11.12"]\n[EndTime "23:33:39"]\n[Link "https://www.chess.com/game/live/62034619159"]\n\n1. e4 {[%clk 0:03:00]} 1... c5 {[%clk 0:02:59.8]} 2. Bc4 {[%clk 0:02:58.7]} 2... e6 {[%clk 0:02:58.7]} 3. Qf3 {[%clk 0:02:57.9]} 3... Nc6 {[%clk 0:02:52.6]} 4. d4 {[%clk 0:02:55.2]} 4... Nxd4 {[%clk 0:02:50.6]} 5. Qf4 {[%clk 0:02:50.2]} 5... Nxc2+ {[%clk 0:02:43.7]} 6. Kd2 {[%clk 0:02:49.3]} 6... Nxa1 {[%clk 0:02:39.5]} 7. Nf3 {[%clk 0:02:48]} 7... Nf6 {[%clk 0:02:34.3]} 8. Ne5 {[%clk 0:02:46.7]} 8... Be7 {[%clk 0:02:26.4]} 9. g4 {[%clk 0:02:45.2]} 9... O-O {[%clk 0:02:23.2]} 10. g5 {[%clk 0:02:44.5]} 10... Nd5 {[%clk 0:02:18.2]} 11. Bxd5 {[%clk 0:02:43.1]} 11... exd5 {[%clk 0:02:15.8]} 12. h4 {[%clk 0:02:41]} 12... dxe4 {[%clk 0:02:14.4]} 13. Qxe4 {[%clk 0:02:40]} 13... Qa5+ {[%clk 0:02:07.6]} 14. Ke2 {[%clk 0:02:37.6]} 14... Qb5+ {[%clk 0:01:58.4]} 15. Kf3 {[%clk 0:02:35.5]} 15... Qc6 {[%clk 0:01:30.7]} 16. Nxc6 {[%clk 0:02:30.6]} 16... bxc6 {[%clk 0:01:29]} 17. Qxe7 {[%clk 0:02:29.7]} 17... Ba6 {[%clk 0:01:27.2]} 18. Qxc5 {[%clk 0:02:23.2]} 18... Rfe8 {[%clk 0:01:24.3]} 19. h5 {[%clk 0:02:15.3]} 19... Bd3 {[%clk 0:01:20.3]} 20. Na3 {[%clk 0:02:12.6]} 20... Nc2 {[%clk 0:01:15.4]} 21. Nxc2 {[%clk 0:02:10.2]} 21... Be4+ {[%clk 0:01:07.4]} 22. Kg3 {[%clk 0:02:05]} 22... Bxh1 {[%clk 0:01:04.9]} 23. h6 {[%clk 0:02:04.3]} 23... g6 {[%clk 0:01:02.4]} 24. Qc3 {[%clk 0:02:02.5]} 24... f6 {[%clk 0:00:42.9]} 25. Qxf6 {[%clk 0:02:00.9]} 25... Bd5 {[%clk 0:00:37.8]} 26. Qg7# {[%clk 0:01:59.3]} 1-0\n'
    game = parse_pgn(test_pgn)

    blunders = find_blunders(game, player_color = chess.BLACK)

    for b in blunders:
        print('---- BEFORE')
        print(chess.Board(b.fen))
        print('---- MOVES ----')
        print('Played: ' +str(b.move_played))
        print('Best: ' +str(b.best_move))
        print(b.color_to_move)
        print(b.eval_change)
        print('---- AFTER ----')
        print(chess.Board(b.fen_after))

    return game, blunders

class BlunderParams:
    '''
    Encodes parameters by which to select blunders
    '''

    def __init__(self) -> None:
        pass

class Blunder:
    '''
    This class encodes all information about a position in which a blunder occured
    '''

    def __init__(self, 
                 fen, 
                 move_played, 
                 best_move, 
                 fen_after = None,
                 color_to_move = None,
                 eval_change = 0) -> None:

        self.fen = fen
        self.fen_after = fen_after
        self.move_played = move_played
        self.best_move = best_move
        self.color_to_move = color_to_move
        self.eval_change = eval_change
    
    def get_fen_after(self):
        #TODO push move on board to grab updated fen
        pass


def parse_pgn(pgn_txt):
    '''
    Takes in a pgn as a string and returns its python-chess object representation.
    '''
    o = io.StringIO(pgn_txt)
    game = chess.pgn.read_game(o)
    
    return game

def filter_games():
    '''
    Todo: filter a list of games by params
    '''
    pass



def find_blunders(game, engine = None, player_color=None):
    #player_color white = True

    if engine == None: engine = start_engine()
    

    # Load the PGN into a chess.pgn object
    #pgn = chess.pgn.read_game(chess.io.StringIO(pgn))

    # Initialize the list of blunders and the board
    blunders = []
    board = chess.Board()
    eval, best_move = get_evaluation(board, engine)

    # Iterate through each move in the game
    for move in game.mainline_moves():

        current_fen = board.fen()
        # Make the move on the board
        board.push(move)

        new_fen = board.fen()

        # Get the evaluation of the new position from Stockfish
        new_eval, new_best_move = get_evaluation(board, engine)

        eval_change = new_eval - eval

        # If the move was made by white and the evaluation has decreased by 3 points or more, consider it a blunder
        if board.turn == chess.BLACK and eval_change <= -300 and player_color is not False:
            
            b = Blunder(fen=current_fen,
                        fen_after=new_fen,
                        move_played=move,
                        best_move=best_move,
                        color_to_move=chess.WHITE,
                        eval_change=eval_change)
            blunders.append(b)
            
        # If the move was made by black and the evaluation has increased by 3 points or more, consider it a blunder
        elif board.turn == chess.WHITE and eval_change >= 300 and player_color is not True:
            
            b = Blunder(fen = current_fen,
                        fen_after=new_fen,
                        move_played=move,
                        best_move=best_move,
                        color_to_move=chess.BLACK,
                        eval_change=eval_change)
            blunders.append(b)

        eval = new_eval
        best_move = new_best_move

    return blunders

def get_evaluation(board, engine, limit_time = 0.3, return_best_move = True):

    if engine == None: engine = start_engine()

    if return_best_move:
        best_move = None
        eval = engine.analyse(board, chess.engine.Limit(time=limit_time))
        score = eval['score'].white().score(mate_score = 10000)
        if 'pv' in eval.keys(): best_move = eval['pv'][0]

        return (score, best_move)

    return engine.analyse(board, chess.engine.Limit(time=limit_time))['score'].white().score(mate_score = 10000)

def start_engine(engine_name = 'stockfish-windows-x86-64-avx2'):

    return chess.engine.SimpleEngine.popen_uci(engine_name)