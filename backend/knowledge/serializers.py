from rest_framework import serializers

VALID_EMOTIONS = ["happy", "sad", "anxious", "angry", ""]

class KnowledgeSearchSerializer(serializers.Serializer):
    query    = serializers.CharField(min_length=1)
    emotion  = serializers.ChoiceField(choices=VALID_EMOTIONS, default="")
    is_crisis = serializers.BooleanField(default=False)