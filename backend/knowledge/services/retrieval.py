import logging
from sentence_transformers import SentenceTransformer
from django.db.models import Q
from pgvector.django import CosineDistance
from knowledge.models import KnowledgeChunk

logger = logging.getLogger("exhale")

_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")


def retrieve(query_text: str, emotion: str, top_k: int = 3, is_crisis: bool = False) -> list[str]:
    try:
        embedding = _model.encode(query_text).tolist()

        if is_crisis:
            chunks = (
                KnowledgeChunk.objects
                .filter(category="crisis_resource")
                .order_by(CosineDistance("embedding", embedding))[:top_k]
            )
        else:
            chunks = (
                KnowledgeChunk.objects
                .exclude(category="crisis_resource")
                .filter(Q(emotion_tag=emotion) | Q(emotion_tag=""))
                .order_by(CosineDistance("embedding", embedding))[:top_k]
            )

        results = [chunk.content for chunk in chunks]
        logger.info(
            "Retrieved %d chunks for emotion=%s is_crisis=%s",
            len(results), emotion, is_crisis
        )
        return results

    except Exception as e:
        logger.error("Retrieval failed: %s", str(e))
        return []
