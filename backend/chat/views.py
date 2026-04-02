import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from chat.models import Conversation, ChatMessage
from chat.serializers import ConversationSerializer, ChatMessageSerializer, SendMessageSerializer
from chat.exceptions import LLMAPIError
from chat.graph import chat_graph
from mood.models import MoodLog

logger = logging.getLogger("exhale")


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(user=request.user).order_by("-created_at")
        return Response(ConversationSerializer(conversations, many=True).data)

    def post(self, request):
        conversation = Conversation.objects.create(user=request.user)
        return Response(ConversationSerializer(conversation).data, status=201)


class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, conversation_id):
        try:
            serializer = SendMessageSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"error": serializer.errors}, status=400)

            try:
                conversation = Conversation.objects.get(id=conversation_id, user=request.user)
            except Conversation.DoesNotExist:
                return Response({"error": "Conversation not found."}, status=404)

            content = serializer.validated_data["content"]

            result = chat_graph.invoke(
                {
                    "text": content,
                    "emotion": None,
                    "confidence": None,
                    "is_crisis": False,
                    "context": [],
                    "ai_response": None,
                    "smart_action": None,
                    "conversation_id": conversation.id,
                    "user_id": request.user.id,
                },
                config={"configurable": {"thread_id": str(conversation.id)}},
            )

            emotion    = result["emotion"]
            confidence = result["confidence"]
            is_crisis  = result["is_crisis"]

            user_msg = ChatMessage.objects.create(
                user=request.user,
                conversation=conversation,
                content=content,
                role="user",
                emotion=emotion,
                emotion_confidence=confidence,
            )

            ai_msg = ChatMessage.objects.create(
                user=request.user,
                conversation=conversation,
                content=result["ai_response"],
                role="assistant",
            )

            MoodLog.objects.create(
                user=request.user,
                emotion=emotion,
                confidence=confidence,
                source="chat",
            )

            logger.info(
                "Message sent — user_id=%s conversation_id=%s emotion=%s confidence=%.2f is_crisis=%s",
                request.user.id, conversation.id, emotion, confidence, is_crisis,
            )

            return Response({
                "user_message": ChatMessageSerializer(user_msg).data,
                "ai_message":   ChatMessageSerializer(ai_msg).data,
                "smart_action": result["smart_action"],
                "is_crisis":    is_crisis,
            })

        except LLMAPIError as e:
            logger.error("LLM API failed — user_id=%s: %s", request.user.id, str(e))
            return Response({"error": "AI service temporarily unavailable."}, status=503)
        except Exception as e:
            logger.error("Unexpected error in SendMessageView — user_id=%s: %s", request.user.id, str(e))
            return Response({"error": "Something went wrong. Please try again."}, status=500)


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=404)

        messages = (
            ChatMessage.objects
            .filter(conversation=conversation)
            .order_by("timestamp")
            .only("id", "content", "role", "emotion", "emotion_confidence", "timestamp")
        )
        return Response(ChatMessageSerializer(messages, many=True).data)


class ClearChatView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=404)

        ChatMessage.objects.filter(conversation=conversation).delete()
        return Response({"message": "Chat cleared."})