import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from knowledge.serializers import KnowledgeSearchSerializer
from knowledge.services.retrieval import retrieve

logger = logging.getLogger("exhale")


class KnowledgeSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = KnowledgeSearchSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"error": serializer.errors}, status=400)

        data = serializer.validated_data
        results = retrieve(
            query_text=data["query"],
            emotion=data["emotion"],
            stage=data.get("stage", "general"),
            is_crisis=data["is_crisis"],
        )
        return Response({"results": results})
