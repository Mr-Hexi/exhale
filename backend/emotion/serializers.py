from rest_framework import serializers


class DetectEmotionSerializer(serializers.Serializer):
    text = serializers.CharField(
        required=True,
        allow_blank=False,
        max_length=2000,
        error_messages={
            "required": "Text is required.",
            "blank": "Text cannot be blank.",
        }
    )