import logging
import math
from sentence_transformers import SentenceTransformer
from pgvector.django import CosineDistance
from knowledge.models import KnowledgeChunk

logger = logging.getLogger("exhale")

MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_model = None
EXACT_EMOTION_BONUS = 0.18
RELATED_EMOTION_BONUS = 0.1
UNTAGGED_EMOTION_BONUS = 0.06
STAGE_KEYWORD_BONUS = 0.12
STAGE_CATEGORY_BONUS = 0.08
DIVERSITY_SIMILARITY_THRESHOLD = 0.88

RELATED_EMOTIONS = {
    "anxious": {"sad", "angry"},
    "sad": {"anxious", "angry"},
    "angry": {"anxious", "sad"},
    "happy": set(),
}

STAGE_PRIORITY_HINTS = {
    "burnout": {
        "keywords": {
            "burnout", "exhausted", "drained", "tired", "rest", "overwhelmed", "pressure"
        },
        "categories": {"validation", "insight", "psychoeducation", "reflection_question"},
    },
    "hopelessness": {
        "keywords": {
            "hopeless", "stuck", "no point", "nothing will change", "can't go on", "meaning"
        },
        "categories": {"reframe", "insight", "validation", "psychoeducation"},
    },
    "self_doubt": {
        "keywords": {
            "not good enough", "self-doubt", "imposter", "judged", "fear of judgment", "failure"
        },
        "categories": {"reframe", "validation", "reflection_question", "insight"},
    },
}

CATEGORY_TO_LABEL = {
    "cbt_technique": "Technique",
    "breathing_grounding": "Technique",
    "reflection_question": "Question",
    "psychoeducation": "Insight",
    "insight": "Insight",
    "reframe": "Reframe",
    "validation": "Validation",
    "perspective": "Perspective",
    "question": "Question",
    "technique": "Technique",
    "crisis_resource": "Resource",
}


def get_embedding_model():
    global _model

    if _model is None:
        logger.info("Loading embedding model: %s", MODEL_NAME)
        _model = SentenceTransformer(MODEL_NAME)

    return _model


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    if not vec_a or not vec_b:
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _is_duplicate_embedding(
    embedding: list[float],
    selected_embeddings: list[list[float]],
    threshold: float = DIVERSITY_SIMILARITY_THRESHOLD,
) -> bool:
    return any(_cosine_similarity(embedding, chosen) > threshold for chosen in selected_embeddings)


def _resolve_stage(stage: str | None, query_text: str) -> str:
    if stage and stage != "general":
        return stage

    query_text_lower = query_text.lower()
    for stage_name, config in STAGE_PRIORITY_HINTS.items():
        if any(keyword in query_text_lower for keyword in config["keywords"]):
            return stage_name
    return "general"


def _emotion_bonus(chunk_emotion: str, emotion: str | None) -> float:
    if not emotion:
        return 0.0
    if chunk_emotion == emotion:
        return EXACT_EMOTION_BONUS
    if not chunk_emotion:
        return UNTAGGED_EMOTION_BONUS
    if chunk_emotion in RELATED_EMOTIONS.get(emotion, set()):
        return RELATED_EMOTION_BONUS
    return 0.0


def _stage_bonus(content: str, category: str, stage: str) -> float:
    if not stage or stage == "general":
        return 0.0

    config = STAGE_PRIORITY_HINTS.get(stage)
    if not config:
        return 0.0

    content_lower = content.lower()
    bonus = 0.0
    if any(keyword in content_lower for keyword in config["keywords"]):
        bonus += STAGE_KEYWORD_BONUS
    if category in config["categories"]:
        bonus += STAGE_CATEGORY_BONUS
    return bonus


def _label_for_chunk(category: str, content: str) -> str:
    if category in CATEGORY_TO_LABEL:
        return CATEGORY_TO_LABEL[category]

    lowered = content.lower().strip()
    if lowered.endswith("?"):
        return "Question"
    if any(phrase in lowered for phrase in ("it's common", "it is common", "you're not alone", "normal to")):
        return "Validation"
    if any(phrase in lowered for phrase in ("often", "usually", "can mean", "might be")):
        return "Reframe"
    return "Insight"


def retrieve(
    query_text: str,
    emotion: str,
    stage: str | None = "general",
    top_k: int = 3,
    is_crisis: bool = False,
) -> list[str]:
    try:
        model = get_embedding_model()
        embedding = model.encode(query_text).tolist()
        resolved_stage = _resolve_stage(stage, query_text)

        if is_crisis:
            chunks = (
                KnowledgeChunk.objects
                .filter(category="crisis_resource")
                .order_by(CosineDistance("embedding", embedding))[:top_k]
            )
            results = [f"Resource: {chunk.content}" for chunk in chunks]
        else:
            candidate_pool_size = max(20, top_k * 12)
            candidates = list(
                KnowledgeChunk.objects
                .exclude(category="crisis_resource")
                .annotate(distance=CosineDistance("embedding", embedding))
                .order_by("distance")[:candidate_pool_size]
            )

            ranked: list[tuple[float, float, KnowledgeChunk]] = []
            for chunk in candidates:
                semantic_similarity = 1 - float(chunk.distance)
                score = semantic_similarity
                score += _emotion_bonus(chunk.emotion_tag, emotion)
                score += _stage_bonus(chunk.content, chunk.category, resolved_stage)
                ranked.append((score, semantic_similarity, chunk))

            ranked.sort(key=lambda item: (item[0], item[1]), reverse=True)

            selected_chunks: list[KnowledgeChunk] = []
            selected_embeddings: list[list[float]] = []
            for _, _, chunk in ranked:
                chunk_embedding = list(chunk.embedding)
                if _is_duplicate_embedding(chunk_embedding, selected_embeddings):
                    continue
                selected_chunks.append(chunk)
                selected_embeddings.append(chunk_embedding)
                if len(selected_chunks) >= top_k:
                    break

            if len(selected_chunks) < top_k:
                for _, _, chunk in ranked:
                    if chunk in selected_chunks:
                        continue
                    selected_chunks.append(chunk)
                    if len(selected_chunks) >= top_k:
                        break

            results = [
                f"{_label_for_chunk(chunk.category, chunk.content)}: {chunk.content}"
                for chunk in selected_chunks
            ]
        logger.info(
            "Retrieved %d chunks for emotion=%s stage=%s is_crisis=%s",
            len(results), emotion, resolved_stage, is_crisis
        )
        return results

    except Exception as e:
        logger.error("Retrieval failed: %s", str(e))
        return []
