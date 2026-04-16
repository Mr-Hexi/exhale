import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from chat.models import Conversation, ChatMessage
from chat.serializers import ConversationSerializer, ChatMessageSerializer, SendMessageSerializer
from chat.exceptions import LLMAPIError
from chat.services.llm_chat_service import generate_conversation_title
from mood.models import MoodLog
import queue
import threading
import json
from django.http import StreamingHttpResponse
from django.db import close_old_connections, OperationalError, InterfaceError

logger = logging.getLogger("exhale")


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(user=request.user).order_by("-created_at")
        return Response(ConversationSerializer(conversations, many=True).data)

    def post(self, request):
        serializer = ConversationSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)

        conversation = Conversation.objects.create(user=request.user, **serializer.validated_data)
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
            user_id = request.user.id
            conversation_pk = conversation.id

            q = queue.Queue()

            def bg_thread():
                try:
                    close_old_connections()
                    from users.models import User
                    from chat.graph import get_chat_graph

                    user = User.objects.get(id=user_id)
                    convo = Conversation.objects.get(id=conversation_pk, user_id=user_id)
                    is_first_turn = not ChatMessage.objects.filter(conversation_id=conversation_pk).exists()
                    topics_list = [t.name for t in user.topics.all()] if hasattr(user, "topics") else []

                    input_state = {
                        "text": content,
                        "emotion": None,
                        "stage": None,
                        "confidence": None,
                        "context": [],
                        "ai_response": None,
                        "conversation_id": conversation_pk,
                        "user_id": user_id,
                        "user_nickname": getattr(user, "nickname", None),
                        "user_age": getattr(user, "age_range", None),
                        "user_topics": topics_list,
                        "journal_context": convo.journal_context,
                    }

                    graph = get_chat_graph()
                    try:
                        result = graph.invoke(
                            input_state,
                            config={"configurable": {"thread_id": str(conversation_pk), "stream_queue": q}},
                        )
                    except (OperationalError, InterfaceError):
                        close_old_connections()
                        result = get_chat_graph().invoke(
                            input_state,
                            config={"configurable": {"thread_id": str(conversation_pk), "stream_queue": q}},
                        )

                    emotion = result["emotion"]
                    confidence = result["confidence"]
                    is_crisis = result["is_crisis"]

                    user_msg = ChatMessage.objects.create(
                        user=user,
                        conversation=convo,
                        content=content,
                        role="user",
                        emotion=emotion,
                        emotion_confidence=confidence,
                    )

                    ai_msg = ChatMessage.objects.create(
                        user=user,
                        conversation=convo,
                        content=result["ai_response"],
                        role="assistant",
                    )

                    if is_first_turn and (convo.title or "").strip().lower() == "new chat":
                        convo.title = generate_conversation_title(content)
                        convo.save(update_fields=["title"])

                    MoodLog.objects.create(
                        user=user,
                        emotion=emotion,
                        confidence=confidence,
                        source="chat",
                    )

                    logger.info(
                        "Message sent - user_id=%s conversation_id=%s emotion=%s confidence=%.2f is_crisis=%s",
                        user_id,
                        conversation_pk,
                        emotion,
                        confidence,
                        is_crisis,
                    )

                    q.put(
                        {
                            "type": "done",
                            "result": {
                                "user_message": ChatMessageSerializer(user_msg).data,
                                "ai_message": ChatMessageSerializer(ai_msg).data,
                                "is_crisis": is_crisis,
                                "conversation": ConversationSerializer(convo).data,
                            },
                        }
                    )

                except LLMAPIError as e:
                    logger.error("LLM API failed - user_id=%s: %s", user_id, str(e))
                    q.put({"type": "error", "error": "AI service temporarily unavailable."})
                except Exception as e:
                    logger.error("Unexpected error in bg_thread - user_id=%s: %s", user_id, str(e))
                    q.put({"type": "error", "error": "Something went wrong. Please try again."})
                finally:
                    close_old_connections()

            threading.Thread(target=bg_thread, daemon=True).start()

            def generate():
                while True:
                    item = q.get()
                    if item.get("type") == "chunk":
                        yield f"data: {json.dumps(item)}\n\n"
                    elif item.get("type") == "done":
                        yield f"data: {json.dumps(item)}\n\n"
                        break
                    elif item.get("type") == "error":
                        yield f"data: {json.dumps(item)}\n\n"
                        break

            response = StreamingHttpResponse(generate(), content_type="text/event-stream")
            response["Cache-Control"] = "no-cache"
            response["X-Accel-Buffering"] = "no"  # For Nginx to pass chunked stream immediately
            return response

        except LLMAPIError as e:
            logger.error("LLM API failed - user_id=%s: %s", request.user.id, str(e))
            return Response({"error": "AI service temporarily unavailable."}, status=503)
        except Exception as e:
            logger.error("Unexpected error in SendMessageView - user_id=%s: %s", request.user.id, str(e))
            return Response({"error": "Something went wrong. Please try again."}, status=500)


class ChatHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=404)

        messages = (
            ChatMessage.objects.filter(conversation=conversation)
            .order_by("timestamp")
            .only("id", "content", "role", "emotion", "emotion_confidence", "timestamp")
        )
        return Response(ChatMessageSerializer(messages, many=True).data)


class ClearChatView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, conversation_id):
        try:
            logger.info("Clearing chat - user_id=%s conversation_id=%s", request.user.id, conversation_id)
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=404)

        ChatMessage.objects.filter(conversation=conversation).delete()
        return Response({"message": "Chat cleared."})


class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=404)

        serializer = ConversationSerializer(conversation, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)

        serializer.save()
        return Response(serializer.data, status=200)

    def delete(self, request, conversation_id):
        try:
            logger.info("Deleting conversation - user_id=%s conversation_id=%s", request.user.id, conversation_id)
            conversation = Conversation.objects.get(id=conversation_id, user=request.user)
            conversation.delete()
            return Response({"message": "Conversation deleted."}, status=200)
        except Conversation.DoesNotExist:
            return Response({"error": "Conversation not found."}, status=404)
