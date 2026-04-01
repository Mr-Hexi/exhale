from django.shortcuts import render
import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from .serializers import RegisterSerializer

logger = logging.getLogger("exhale")


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            serializer = RegisterSerializer(data=request.data)
            if not serializer.is_valid():
                return Response({"error": serializer.errors}, status=400)

            user = serializer.save()
            logger.info("User registered: %s", user.id)
            return Response({"message": "registered", "user_id": user.id}, status=201)

        except Exception as e:
            logger.error("Unexpected error in RegisterView: %s", str(e))
            return Response({"error": "Registration failed."}, status=500)