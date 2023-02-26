import requests
import chess.pgn
import io

def get_pgns(player_id, limit = None, blunder_params = {}):
    '''
    Returns a list of string pgns from a given chess.com player id.

    param player_id: string, the id/username of the player
    param limit: int, optional, the max number of (most recent) games to fetch/return
    '''

    # TODO error handling if player ID not found
    # TODO optimize calls if limit is passed
    # TODO filter by game attributes (player color, game type, wins etc)

    url = 'https://api.chess.com/pub/player/' + player_id + '/games/archives'
    archive_list = requests.get(url).json()['archives']
    
    all_pgns = []

    for link in archive_list:

        if len(all_pgns) < limit:
            games = requests.get(link).json()['games']
            pgns = [x['pgn'] for x in games if 'pgn' in x.keys()]
            all_pgns.extend(pgns)

    if limit is not None and len(all_pgns) > limit:
        all_pgns = all_pgns[limit:]

    return all_pgns

def pgn_meets_params(pgn, blunder_params):

    # seems hard to check pgn string against params
    # maybe easier after conversion to object?
    # may have to replace with game_meets_params function here
    # if certain info about game is not in PGN (time per move)
    return True