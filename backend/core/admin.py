from django.contrib import admin
from .models import Game, Blunder, PlayerAttempt


@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ['id', 'white_player', 'black_player', 'result', 'played_at', 'analysis_status']
    list_filter = ['analysis_status', 'game_type']
    search_fields = ['white_player', 'black_player']


@admin.register(Blunder)
class BlunderAdmin(admin.ModelAdmin):
    list_display = ['id', 'game', 'move_number', 'player_color', 'actual_move', 'best_move', 'eval_delta']
    list_filter = ['player_color', 'blunder_type']
    search_fields = ['game__white_player', 'game__black_player']


@admin.register(PlayerAttempt)
class PlayerAttemptAdmin(admin.ModelAdmin):
    list_display = ['id', 'blunder', 'attempted_move', 'outcome', 'attempted_at']
    list_filter = ['outcome']

