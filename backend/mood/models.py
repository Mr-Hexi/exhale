from django.db import models
from django.conf import settings


class MoodLog(models.Model):
    SOURCE_CHOICES = [
        ("chat",    "Chat"),
        ("journal", "Journal"),
        ("checkin", "Check-in"),
    ]
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mood_logs")
    emotion    = models.CharField(max_length=20)
    confidence = models.FloatField()
    source     = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    logged_at  = models.DateTimeField(auto_now_add=True)


    class Meta:
        ordering = ["logged_at"]
        
class MoodInsightCache(models.Model):
    user         = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mood_insight_cache")
    insight_text = models.TextField(blank=True)
    generated_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"InsightCache for user {self.user_id}"