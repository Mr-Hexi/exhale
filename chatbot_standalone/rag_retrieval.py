"""
Simplified RAG retrieval using PostgreSQL + pgvector.

Removes custom scoring and relies on database vector similarity.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

import psycopg2

try:
    from sentence_transformers import SentenceTransformer
except Exception:
    SentenceTransformer = None


MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_model = None


# -----------------------------
# Embedding
# -----------------------------
def _get_model():
    global _model
    if _model is None and SentenceTransformer is not None:
        _model = SentenceTransformer(MODEL_NAME)
    return _model


def _embed(text: str) -> list[float] | None:
    model = _get_model()
    if model is None:
        return None
    return model.encode(text).tolist()


# -----------------------------
# Label Mapping
# -----------------------------
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


def _label_for_chunk(category: str, content: str) -> str:
    if category in CATEGORY_TO_LABEL:
        return CATEGORY_TO_LABEL[category]

    text = content.lower().strip()

    if text.endswith("?"):
        return "Question"
    if "you're not alone" in text:
        return "Validation"

    return "Insight"


# Main Retrieval

def retrieve(
    query_text: str,
    emotion: str | None = None,
    top_k: int = 3,
    stage: str | None = None,
    is_crisis: bool = False,
) -> list[str]:
    """
    Retrieve top-k similar chunks using pgvector with optional emotion filter
    and fallback to no-emotion filtering if needed.
    """

    import os
    import psycopg2

    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        return []

    query_embedding = _embed(query_text)
    if query_embedding is None:
        return []

    def _run_query(use_emotion: bool):
        """Run SQL query with or without emotion filter."""
        where_conditions = []

        # Crisis filter
        if is_crisis:
            where_conditions.append("category = 'crisis_resource'")
        else:
            where_conditions.append("category <> 'crisis_resource'")

        # Emotion filter (optional)
        params = []
        if use_emotion and emotion:
            where_conditions.append("emotion_tag = %s")
            params.append(emotion)

        where_clause = "WHERE " + " AND ".join(where_conditions)

        sql = f"""
            SELECT content, category
            FROM knowledge_knowledgechunk
            {where_clause}
            ORDER BY embedding <-> %s
            LIMIT %s
        """

        params.append(query_embedding)
        params.append(top_k)

        with psycopg2.connect(database_url) as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return cur.fetchall()

    try:
        # 🔹 First try: with emotion filter
        rows = _run_query(use_emotion=True)

        # 🔹 Fallback: retry without emotion if no results
        if not rows and emotion:
            rows = _run_query(use_emotion=False)

    except Exception:
        return []

    return [
        f"{_label_for_chunk(category, content)}: {content}"
        for content, category in rows
    ]