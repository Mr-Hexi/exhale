from rest_framework import serializers

VALID_EMOTIONS = ["happy", "sad", "anxious", "angry", ""]
VALID_STAGES = ["general", "self_doubt", "burnout", "hopelessness"]

class KnowledgeSearchSerializer(serializers.Serializer):
    query    = serializers.CharField(min_length=1)
    emotion  = serializers.ChoiceField(choices=VALID_EMOTIONS, default="")
    stage = serializers.ChoiceField(choices=VALID_STAGES, default="general", required=False)
    is_crisis = serializers.BooleanField(default=False)
