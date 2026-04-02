import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import JournalEntry
from .serializers import JournalEntrySerializer, JournalEntryWriteSerializer
from emotion.services.emotion_service import classify_emotion
from mood.models import MoodLog
from services.llm_client import get_completion
from chat.exceptions import LLMAPIError
from chat.models import AIPrompt
logger = logging.getLogger("exhale")




class JournalListCreateView(APIView):
    def get(self, request):
        entries = JournalEntry.objects.filter(user=request.user).values(
            "id", "content", "emotion", "ai_insight", "created_at", "updated_at"
        )
        return Response(list(entries))

    def post(self, request):
        try:
            serializer = JournalEntryWriteSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"error": serializer.errors}, status=400)

            content = serializer.validated_data["content"]
            result = classify_emotion(content)

            entry = JournalEntry.objects.create(
                user=request.user,
                content=content,
                emotion=result.get("emotion"),
            )

            if not result.get("is_crisis"):
                MoodLog.objects.create(
                    user=request.user,
                    emotion=result.get("emotion", "sad"),
                    confidence=result.get("emotion_confidence", 1.0),
                    source="journal",
                )

            logger.info("Journal entry created for user %s", request.user.id)
            return Response(JournalEntrySerializer(entry).data, status=201)

        except LLMAPIError as e:
            logger.error("LLM failed in journal create for user %s: %s", request.user.id, str(e))
            return Response({"error": "AI service temporarily unavailable."}, status=503)

        except Exception as e:
            logger.error("Unexpected error in JournalListCreateView for user %s: %s", request.user.id, str(e))
            return Response({"error": "Something went wrong."}, status=500)


class JournalDetailView(APIView):
    def get_entry(self, entry_id, user):
        try:
            return JournalEntry.objects.get(id=entry_id, user=user)
        except JournalEntry.DoesNotExist:
            return None

    def get(self, request, entry_id):
        entry = self.get_entry(entry_id, request.user)
        if not entry:
            return Response({"error": "Entry not found."}, status=404)
        return Response(JournalEntrySerializer(entry).data)

    def put(self, request, entry_id):
        try:
            entry = self.get_entry(entry_id, request.user)
            if not entry:
                return Response({"error": "Entry not found."}, status=404)

            serializer = JournalEntryWriteSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"error": serializer.errors}, status=400)

            content = serializer.validated_data["content"]
            result = classify_emotion(content)

            entry.content = content
            entry.emotion = result.get("emotion")
            entry.save()

            logger.info("Journal entry %s updated for user %s", entry_id, request.user.id)
            return Response(JournalEntrySerializer(entry).data)

        except Exception as e:
            logger.error("Unexpected error in JournalDetailView PUT for user %s: %s", request.user.id, str(e))
            return Response({"error": "Something went wrong."}, status=500)

    def delete(self, request, entry_id):
        entry = self.get_entry(entry_id, request.user)
        if not entry:
            return Response({"error": "Entry not found."}, status=404)
        entry.delete()
        logger.info("Journal entry %s deleted for user %s", entry_id, request.user.id)
        return Response({"message": "Entry deleted."}, status=204)


class JournalInsightView(APIView):
    def post(self, request, entry_id):
        try:
            entry = JournalEntry.objects.get(id=entry_id, user=request.user)
        except JournalEntry.DoesNotExist:
            return Response({"error": "Entry not found."}, status=404)

        try:
            journal_insight_prompt = AIPrompt.objects.get(name="journal_insight_prompt").content
            prompt = journal_insight_prompt.format(
                entry=entry.content,
                emotion=entry.emotion or "unknown",
            )
            messages = [{"role": "user", "content": prompt}]
            insight = get_completion(messages, max_tokens=300, temperature=0.7)

            entry.ai_insight = insight
            entry.save()

            logger.info("AI insight generated for journal entry %s, user %s", entry_id, request.user.id)
            return Response({"insight": insight})

        except LLMAPIError as e:
            logger.error("LLM failed for journal insight, user %s: %s", request.user.id, str(e))
            return Response({"error": "AI service temporarily unavailable."}, status=503)

        except Exception as e:
            logger.error("Unexpected error in JournalInsightView for user %s: %s", request.user.id, str(e))
            return Response({"error": "Something went wrong."}, status=500)