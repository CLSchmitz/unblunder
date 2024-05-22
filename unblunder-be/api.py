import requests
from flask import Flask, request, jsonify

@app.route("/analyze", methods=["GET"])
def analyze_games():
    # Get the player name and number of games from the query parameters
    player_name = request.args.get("player")
    num_games = request.args.get("num_games")
    
    # Retrieve the player's games from the chess.com API
    api_key = "YOUR_API_KEY"
    pgns = get_player_games(player_name, num_games=num_games, api_key=api_key)
    
    # Analyze the games for blunders
    blunders = analysis.find_blunders_in_games(pgns)
    
    # Return the blunders as a JSON response
    return jsonify(blunders)
