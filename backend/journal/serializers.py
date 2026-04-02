from rest_framework import serializers
from .models import JournalEntry


class JournalEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = JournalEntry
        fields = ["id", "content", "emotion", "ai_insight", "created_at", "updated_at"]


class JournalEntryWriteSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1)