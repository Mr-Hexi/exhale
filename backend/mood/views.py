import logging
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import MoodLog, MoodInsightCache
from .serializers import MoodLogSerializer, MoodCheckinSerializer
from services.llm_client import get_completion
from chat.exceptions import LLMAPIError

logger = logging.getLogger("exhale")

CACHE_HOURS = 6


def get_weekly_emotion_summary(user):
    week_ago = timezone.now() - timedelta(days=7)
    counts = (
        MoodLog.objects
        .filter(user=user, logged_at__gte=week_ago)
        .exclude(emotion="neutral")
        .values("emotion")
        .annotate(count=Count("emotion"))
        .order_by("-count")
    )
    return ", ".join(f"{row['emotion']}: {row['count']} times" for row in counts)


TIMELINE_INSIGHT_PROMPT = """
Here is a summary of the user's emotions over the past 7 days:
{emotion_summary}

Write 2-3 short sentences of insight:
- Identify any visible pattern (e.g. most common emotion, trend)
- Offer one encouraging observation
Be warm, not clinical. No diagnosis. No advice beyond gentle reflection.
"""


class MoodHistoryView(APIView):
    def get(self, request):
        logs = MoodLog.objects.filter(user=request.user).order_by("logged_at").values(
            "id", "emotion", "confidence", "source", "logged_at"
        )
        return Response(list(logs))


class MoodStatsView(APIView):
    def get(self, request):
        counts = (
            MoodLog.objects
            .filter(user=request.user)
            .values("emotion")
            .annotate(count=Count("emotion"))
        )
        stats = {row["emotion"]: row["count"] for row in counts}
        return Response(stats)


class MoodCheckinView(APIView):
    def post(self, request):
        serializer = MoodCheckinSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)

        MoodLog.objects.create(
            user=request.user,
            emotion=serializer.validated_data["emotion"],
            confidence=1.0,
            source="checkin",
        )
        logger.info("Mood check-in logged for user %s: %s", request.user.id, serializer.validated_data["emotion"])
        return Response({"message": "Check-in logged."}, status=201)


class WeeklyInsightView(APIView):
    def get(self, request):
        try:
            cache, _ = MoodInsightCache.objects.get_or_create(user=request.user)

            if cache.generated_at and timezone.now() - cache.generated_at < timedelta(hours=CACHE_HOURS):
                return Response({"insight": cache.insight_text})

            summary = get_weekly_emotion_summary(request.user)
            if not summary:
                return Response({"insight": "Not enough mood data yet for an insight."})

            prompt = TIMELINE_INSIGHT_PROMPT.format(emotion_summary=summary)
            messages = [{"role": "user", "content": prompt}]
            insight = get_completion(messages, max_tokens=200, temperature=0.7)

            cache.insight_text = insight
            cache.generated_at = timezone.now()
            cache.save()

            logger.info("Weekly insight generated for user %s", request.user.id)
            return Response({"insight": insight})

        except LLMAPIError as e:
            logger.error("LLM failed for weekly insight, user %s: %s", request.user.id, str(e))
            return Response({"error": "AI service temporarily unavailable."}, status=503)

        except Exception as e:
            logger.error("Unexpected error in WeeklyInsightView for user %s: %s", request.user.id, str(e))
            return Response({"error": "Something went wrong."}, status=500)
