from django.db import models
from django.conf import settings


class JournalEntry(models.Model):
    user       = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="journal_entries")
    content    = models.TextField()
    emotion    = models.CharField(max_length=20, blank=True, null=True)
    ai_insight = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"JournalEntry {self.id} — user {self.user_id}"