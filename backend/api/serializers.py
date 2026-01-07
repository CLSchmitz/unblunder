from rest_framework import serializers
from core.models import Game, Blunder, PlayerAttempt


class GameSerializer(serializers.ModelSerializer):
    opponent = serializers.SerializerMethodField()
    
    class Meta:
        model = Game
        fields = ['id', 'opponent', 'played_at', 'white_elo', 'black_elo', 
                 'result', 'time_control', 'white_player', 'black_player']
    
    def get_opponent(self, obj):
        # Return the opponent's name (not the analyzed player)
        request = self.context.get('request')
        if request and hasattr(request, 'username'):
            username = request.username
            if obj.white_player.lower() == username.lower():
                return obj.black_player
            else:
                return obj.white_player
        # Fallback: return the other player
        return obj.black_player


class BlunderSerializer(serializers.ModelSerializer):
    game = GameSerializer(read_only=True)
    game_id = serializers.IntegerField(write_only=True, required=False)
    
    class Meta:
        model = Blunder
        fields = ['id', 'game_id', 'game', 'move_number', 'fen_before', 'fen_after',
                 'actual_move', 'best_move', 'player_color', 'eval_before', 'eval_after',
                 'eval_delta', 'blunder_type', 'severity', 'time_taken']


class PlayerAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlayerAttempt
        fields = ['id', 'blunder', 'attempted_move', 'outcome', 'attempted_at']
        read_only_fields = ['attempted_at']


class AnalysisRequestSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=255)
    max_games = serializers.IntegerField(required=False, default=50, min_value=1, max_value=200)
    blunder_params = serializers.DictField(required=False, default=dict)


class AnalysisResponseSerializer(serializers.Serializer):
    games_analyzed = serializers.IntegerField()
    blunders_found = serializers.IntegerField()
    blunders = BlunderSerializer(many=True)


class EvaluatePositionRequestSerializer(serializers.Serializer):
    fen = serializers.CharField(required=True, help_text="FEN notation of the position")
    player_color = serializers.ChoiceField(choices=['white', 'black'], required=True, help_text="Player's color")
    depth = serializers.IntegerField(required=False, default=15, min_value=1, max_value=20, help_text="Analysis depth")


class EvaluatePositionResponseSerializer(serializers.Serializer):
    evaluation = serializers.FloatField(help_text="Evaluation in centipawns from player's perspective")
