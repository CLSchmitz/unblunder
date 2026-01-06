from django.db import models
from django.db.models import JSONField


class Game(models.Model):
    chess_com_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    pgn = models.TextField()
    white_player = models.CharField(max_length=255)
    black_player = models.CharField(max_length=255)
    white_elo = models.IntegerField(null=True, blank=True)
    black_elo = models.IntegerField(null=True, blank=True)
    result = models.CharField(max_length=10)
    time_control = models.CharField(max_length=50, null=True, blank=True)
    game_type = models.CharField(max_length=50, null=True, blank=True)
    played_at = models.DateTimeField(null=True, blank=True)
    metadata = JSONField(default=dict, blank=True)
    analyzed_at = models.DateTimeField(null=True, blank=True)
    analysis_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('completed', 'Completed'), ('failed', 'Failed')],
        default='pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.white_player} vs {self.black_player} - {self.result}"


class Blunder(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='blunders')
    move_number = models.IntegerField()
    fen_before = models.CharField(max_length=100)
    fen_after = models.CharField(max_length=100)
    actual_move = models.CharField(max_length=10)  # SAN notation
    best_move = models.CharField(max_length=10)  # SAN notation
    player_color = models.CharField(max_length=5, choices=[('white', 'White'), ('black', 'Black')])
    eval_before = models.FloatField()  # centipawns
    eval_after = models.FloatField()  # centipawns
    eval_delta = models.FloatField()  # negative value
    blunder_type = models.CharField(
        max_length=20,
        choices=[('blunder', 'Blunder'), ('mistake', 'Mistake'), ('inaccuracy', 'Inaccuracy')],
        default='blunder'
    )
    severity = models.FloatField(default=0.0)  # 0-1
    time_taken = models.IntegerField(null=True, blank=True)  # seconds
    analysis_params = JSONField(default=dict, blank=True)
    continuations = JSONField(default=dict, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Blunder {self.move_number} in Game {self.game.id} ({self.player_color})"


class PlayerAttempt(models.Model):
    blunder = models.ForeignKey(Blunder, on_delete=models.CASCADE, related_name='attempts')
    attempted_move = models.CharField(max_length=10)  # SAN notation
    outcome = models.CharField(
        max_length=20,
        choices=[('best_move', 'Best Move'), ('was_blunder', 'Was Blunder'), ('neither', 'Neither')]
    )
    attempted_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attempt on Blunder {self.blunder.id}: {self.outcome}"

