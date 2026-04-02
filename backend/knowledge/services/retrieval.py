import logging
from sentence_transformers import SentenceTransformer
from django.db.models import Q
from pgvector.django import CosineDistance
from knowledge.models import KnowledgeChunk

logger = logging.getLogger("exhale")

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = None


def get_embedding_model():
    global _model

    if _model is None:
        logger.info("Loading embedding model: %s", MODEL_NAME)
        _model = SentenceTransformer(MODEL_NAME)

    return _model


def retrieve(query_text: str, emotion: str, top_k: int = 3, is_crisis: bool = False) -> list[str]:
    try:
        model = get_embedding_model()
        embedding = model.encode(query_text).tolist()

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
