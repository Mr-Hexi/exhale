from django.shortcuts import render
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated

from .serializers import RegisterSerializer, UserProfileSerializer, TopicSerializer

logger = logging.getLogger("exhale")


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            serializer = RegisterSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {
                        "error": "Validation failed.",
                        "errors": serializer.errors,
                    },
                    status=400,
                )

            user = serializer.save()
            logger.info("User registered: %s", user.id)
            return Response({"message": "registered", "user_id": user.id}, status=201)

        except Exception as e:
            logger.error("Unexpected error in RegisterView: %s", str(e))
            return Response({"error": "Registration failed."}, status=500)

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


class TopicListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        from .models import Topic
        topics = Topic.objects.all()
        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data)
