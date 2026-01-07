from django.urls import path
from api import views

urlpatterns = [
    path('analyze/', views.analyze, name='analyze'),
    path('analyze-stream/', views.analyze_stream, name='analyze-stream'),
    path('evaluate-position/', views.evaluate_position, name='evaluate-position'),
    path('dev/blunders/', views.dev_blunders, name='dev-blunders'),
    path('dev/validate-move/', views.dev_validate_move, name='dev-validate-move'),
    path('blunders/', views.blunder_list, name='blunder-list'),
    path('blunders/<int:pk>/', views.blunder_detail, name='blunder-detail'),
    path('blunders/<int:pk>/attempt/', views.blunder_attempt, name='blunder-attempt'),
]

