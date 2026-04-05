import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from chat.models import ChatMessage
from emotion.services.emotion_service import classify_emotion
from chat.exceptions import LLMAPIError
from emotion.serializers import DetectEmotionSerializer
from emotion.exceptions import MLModelError, EmotionClassificationError

logger = logging.getLogger("exhale")


class DetectEmotionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            serializer = DetectEmotionSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"error": serializer.errors}, status=400)

            text = serializer.validated_data["text"]
            result = classify_emotion(text)

            return Response({
                "emotion": result["emotion"],
                "confidence": result.get("emotion_confidence", 1.0),
                "is_crisis": result.get("is_crisis", False),
            }, status=200)

        except LLMAPIError as e:
            logger.error("LLMAPI failed in DetectEmotionView for user %s: %s",
                         request.user.id, str(e))
            return Response(
                {"error": "AI service temporarily unavailable."}, status=503
            )

        except (MLModelError, EmotionClassificationError) as e:
            logger.error("ML error in DetectEmotionView for user %s: %s",
                         request.user.id, str(e))
            return Response(
                {"error": "Emotion detection failed. Please try again."}, status=500
            )

        except Exception as e:
            logger.error("Unexpected error in DetectEmotionView for user %s: %s",
                         request.user.id, str(e))
            return Response(
                {"error": "Something went wrong. Please try again."}, status=500
            )


class EmotionSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count
        counts = (
            ChatMessage.objects
            .filter(user=request.user, role="user", emotion__isnull=False)
            .values("emotion")
            .annotate(count=Count("emotion"))
        )
        summary = {"happy": 0, "sad": 0, "anxious": 0, "angry": 0, "neutral": 0}
        for row in counts:
            if row["emotion"] in summary:
                summary[row["emotion"]] = row["count"]
        return Response(summary)
