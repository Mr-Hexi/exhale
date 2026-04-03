from rest_framework import serializers
from .models import Conversation, ChatMessage


class ConversationSerializer(serializers.ModelSerializer):
    def validate_title(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Conversation title cannot be blank.")
        return stripped

    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at"]
        read_only_fields = ["id", "created_at"]


class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = [
            "id",
            "content",
            "role",
            "emotion",
            "emotion_confidence",
            "timestamp",
        ]
        read_only_fields = fields


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(min_length=1, max_length=2000)

    def validate_content(self, value):
        stripped = value.strip()
        if not stripped:
            raise serializers.ValidationError("Message content cannot be blank.")
        return stripped
