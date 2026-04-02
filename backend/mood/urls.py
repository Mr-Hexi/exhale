from django.urls import path
from .views import MoodHistoryView, MoodStatsView, MoodCheckinView, WeeklyInsightView

urlpatterns = [
    path("history/", MoodHistoryView.as_view(), name="mood-history"),
    path("stats/", MoodStatsView.as_view(), name="mood-stats"),
    path("checkin/", MoodCheckinView.as_view(), name="mood-checkin"),
    path("weekly-insight/", WeeklyInsightView.as_view(), name="mood-weekly-insight"),
]