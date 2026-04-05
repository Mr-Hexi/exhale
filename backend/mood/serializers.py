from rest_framework import serializers
from .models import MoodLog

VALID_EMOTIONS = ["happy", "sad", "anxious", "angry", "neutral"]


class MoodLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MoodLog
        fields = ["id", "emotion", "confidence", "source", "logged_at"]


class MoodCheckinSerializer(serializers.Serializer):
    emotion = serializers.ChoiceField(choices=VALID_EMOTIONS)
