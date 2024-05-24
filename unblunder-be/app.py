# Starting this app:
# Celery worker: 
# # celery -A app.celery worker --loglevel=INFO -P eventlet
# Redis:
# # wsl
# # sudo service redis-server start
# Flask:
# # python app.py




from flask import Flask, request, jsonify
from flask_cors import CORS
from src.chess_api import get_pgns
from src.game_analysis import parse_pgn, filter_games, find_blunders, Blunder
import chess.svg
from IPython.display import SVG, display
from celery import Celery
import redis
import json
import time

# blunder_params object structure: game type, player col, move range, won game
# more difficult to implement: missed mate (in 2/3/x), severity of blunder, time taken to blunder
# very difficult to implement: some intelligent way of picking "worst" blunders

app = Flask(__name__)
cors = CORS(app)


# Configure Redis
r = redis.Redis(host='localhost', port=6379, db=0)



# Configure Celery
app.config['CELERY_BROKER_URL'] = 'redis://localhost:6379/0'
app.config['CELERY_RESULT_BACKEND'] = 'redis://localhost:6379/0'
celery = Celery(app.name, broker=app.config['CELERY_BROKER_URL'])
#celery.conf.update(app.config)

def quickstart():

    test_pgn = '[Event "Live Chess"]\n[Site "Chess.com"]\n[Date "2022.11.12"]\n[Round "-"]\n[White "burgos2012"]\n[Black "chrislschmitz"]\n[Result "1-0"]\n[CurrentPosition "r3r1k1/p2p2Qp/2p3pP/3b2P1/8/6K1/PPN2P2/2B5 b - -"]\n[Timezone "UTC"]\n[ECO "B20"]\n[ECOUrl "https://www.chess.com/openings/Sicilian-Defense-Bowdler-Attack"]\n[UTCDate "2022.11.12"]\n[UTCTime "23:30:03"]\n[WhiteElo "1025"]\n[BlackElo "967"]\n[TimeControl "180"]\n[Termination "burgos2012 won by checkmate"]\n[StartTime "23:30:03"]\n[EndDate "2022.11.12"]\n[EndTime "23:33:39"]\n[Link "https://www.chess.com/game/live/62034619159"]\n\n1. e4 {[%clk 0:03:00]} 1... c5 {[%clk 0:02:59.8]} 2. Bc4 {[%clk 0:02:58.7]} 2... e6 {[%clk 0:02:58.7]} 3. Qf3 {[%clk 0:02:57.9]} 3... Nc6 {[%clk 0:02:52.6]} 4. d4 {[%clk 0:02:55.2]} 4... Nxd4 {[%clk 0:02:50.6]} 5. Qf4 {[%clk 0:02:50.2]} 5... Nxc2+ {[%clk 0:02:43.7]} 6. Kd2 {[%clk 0:02:49.3]} 6... Nxa1 {[%clk 0:02:39.5]} 7. Nf3 {[%clk 0:02:48]} 7... Nf6 {[%clk 0:02:34.3]} 8. Ne5 {[%clk 0:02:46.7]} 8... Be7 {[%clk 0:02:26.4]} 9. g4 {[%clk 0:02:45.2]} 9... O-O {[%clk 0:02:23.2]} 10. g5 {[%clk 0:02:44.5]} 10... Nd5 {[%clk 0:02:18.2]} 11. Bxd5 {[%clk 0:02:43.1]} 11... exd5 {[%clk 0:02:15.8]} 12. h4 {[%clk 0:02:41]} 12... dxe4 {[%clk 0:02:14.4]} 13. Qxe4 {[%clk 0:02:40]} 13... Qa5+ {[%clk 0:02:07.6]} 14. Ke2 {[%clk 0:02:37.6]} 14... Qb5+ {[%clk 0:01:58.4]} 15. Kf3 {[%clk 0:02:35.5]} 15... Qc6 {[%clk 0:01:30.7]} 16. Nxc6 {[%clk 0:02:30.6]} 16... bxc6 {[%clk 0:01:29]} 17. Qxe7 {[%clk 0:02:29.7]} 17... Ba6 {[%clk 0:01:27.2]} 18. Qxc5 {[%clk 0:02:23.2]} 18... Rfe8 {[%clk 0:01:24.3]} 19. h5 {[%clk 0:02:15.3]} 19... Bd3 {[%clk 0:01:20.3]} 20. Na3 {[%clk 0:02:12.6]} 20... Nc2 {[%clk 0:01:15.4]} 21. Nxc2 {[%clk 0:02:10.2]} 21... Be4+ {[%clk 0:01:07.4]} 22. Kg3 {[%clk 0:02:05]} 22... Bxh1 {[%clk 0:01:04.9]} 23. h6 {[%clk 0:02:04.3]} 23... g6 {[%clk 0:01:02.4]} 24. Qc3 {[%clk 0:02:02.5]} 24... f6 {[%clk 0:00:42.9]} 25. Qxf6 {[%clk 0:02:00.9]} 25... Bd5 {[%clk 0:00:37.8]} 26. Qg7# {[%clk 0:01:59.3]} 1-0\n'
    game = parse_pgn(test_pgn)
    blunders = find_blunders(game)
    blunder = blunders[0]
    return game, blunders, blunder

@celery.task
def fake_load_positions(username):
    # Simulate a long-running task

    print('started')

    fens = {
    1: 'K6k/4P3/3PP3/2P1P3/4P3/4P3/2PPPPP1/8 w - - 0 1',
    2: 'K6k/3PP3/2P2P2/4P3/3P4/2PPPP2/8/8 w - - 0 1',
    3: 'K6k/2PPP3/5P2/3PP3/5P2/2PPP3/8/8 w - - 0 1'
    }

    positions = [
        {
            'fen': x,
            'best_move': 'a8a7',
            'blunder_move': 'a8b8'
        } for x in fens.values()
    ]

    print(positions)
    #time.sleep(5)
    
    # Store positions in Redis
    r.set(username, json.dumps(positions))

def grab_blunder_positions(player_id, limit = None, blunder_params = {}):
    '''
    Grabs all (recent) positions in which a player blundered, subject to blunder parameters
    '''

    pgns = get_pgns(player_id, limit, blunder_params = blunder_params)

    games = [parse_pgn(x) for x in pgns]

    #TODO filter
    #filtered_games = filter_games(games, blunder_params)

    filtered_games = games

    positions = [find_blunders(game, player_color=(game.headers['White']==player_id)) for game in filtered_games]
    #TODO collapse


    return positions

def mock_frontend(blunder):
    board = chess.Board(blunder.fen)
    display(chess.svg.board(board, size = 350))
    print('Someone blundered bad in this position (fool)')
    if board.turn: print('White to play')
    else: print ('Black to play')
    print('Input move in format square - square, e.g. "f4f5" (regardless of piece)')
    move = input()
    print('You did ' + move + ', the best move is ' + str(blunder.best_move) + ', blunder was ' + str(blunder.move_played))
    board.push(blunder.move_played)
    display(chess.svg.board(board, size = 350))

@app.route('/hello_world', methods = ['POST'])
def hello_world():
    
    content = request.json

    if content['username'] != 'da_chess_god':
    
        return {
            'fen': 'r1b2rk1/pp1pbppp/8/1qp1N1P1/4Q2P/5K2/PP3P2/nNB4R b - - 4 15',
            'best_move': 'd7d5',
            'blunder_move': 'b5c6'
        }, 200
    
    else:

        return {
            'message': 'We do not serve da_chess_god.'
        }, 400


@app.route('/start_loading', methods=['POST'])
def start_loading():
    data = request.json 
    username = data['username']

    print('here at least')
    fake_load_positions.delay(username)
    return jsonify({"message": "Loading started"}), 202

@app.route('/get_position', methods=['GET'])
def get_position():
    username = request.args.get('username')
    print(username)
    positions = json.loads(r.get(username))

    print(positions)
    if positions:
        position = positions.pop(0)  # Get the first position
        r.set(username, json.dumps(positions))  # Save remaining positions
        return jsonify(position)
    else:
        return jsonify({"message": "No positions available"}), 404

#@app.route('/start_game')
def start_game(): #args username; blunder params

    #get_parameters() 
    #grab_blunder_positions()

    #return number of positions
    #or return all positions
    #store positions in session

    pass

#@app.route('/get_position')
def get_position():
    # return a position
    # store that position has been played
    pass

#@app.route('/evaluate_move')
def eval_user_move():
    # evaluate move made in position
    # return eval and best move
    pass

if __name__ == '__main__':
    app.run(debug=True)