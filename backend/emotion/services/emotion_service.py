import logging
import re

from chat.exceptions import LLMAPIError
from chat.models import AIPrompt
from emotion.exceptions import EmotionClassificationError, MLModelError
from emotion.ml.predict import predict
from services.llm_client import get_completion

logger = logging.getLogger("exhale")

CONFIDENCE_THRESHOLD = 0.70
HAPPY_NEUTRAL_THRESHOLD = 0.60
ALLOWED_LABELS = {"happy", "sad", "anxious", "angry", "neutral"}

CRISIS_KEYWORDS = [
    "end it all",
    "kill myself",
    "want to die",
    "no reason to live",
    "hopeless",
    "can't go on",
    "don't want to be here",
    "suicidal",
    "hurt myself",
    "self harm",
    "worthless",
    "give up on life",
    "cut myself",
    "die",
    "do something bad to myself",
    "do something bad with myself",
    "i might hurt myself",
    "thinking of hurting myself",
]

SAFE_EXIT_KEYWORDS = ["i'm okay", "i am fine", "feeling better"]


def check_crisis(text: str) -> bool:
    text_lower = text.lower().replace("\u2019", "'")

    negated_patterns = (
        r"\bnot going to hurt myself(?: anymore)?\b",
        r"\bdo not feel like i(?: am|'m)? going to hurt myself(?: anymore)?\b",
        r"\bdon't feel like i(?: am|'m)? going to hurt myself(?: anymore)?\b",
        r"\bwill not hurt myself(?: anymore)?\b",
        r"\bwon't hurt myself(?: anymore)?\b",
        r"\bdo not want to hurt myself(?: anymore)?\b",
        r"\bdon't want to hurt myself(?: anymore)?\b",
        r"\bno longer want to hurt myself\b",
    )
    if any(re.search(pattern, text_lower) for pattern in negated_patterns):
        return False

    for keyword in CRISIS_KEYWORDS:
        if keyword in text_lower:
            return True

    if "myself" in text_lower and any(token in text_lower for token in ("bad", "hurt", "harm")):
        return True
    return False


def should_exit_crisis(text: str) -> bool:
    text_lower = text.lower().replace("\u2019", "'")
    if any(keyword in text_lower for keyword in SAFE_EXIT_KEYWORDS):
        return True

    exit_patterns = (
        r"\bfeeling (?:a bit |much )?better\b",
        r"\bi (?:do not|don't|am not|ain't) feel like i(?: am|'m)? going to hurt myself(?: anymore)?\b",
        r"\bi(?: am|'m)? not going to hurt myself(?: anymore)?\b",
        r"\bi (?:will not|won't) hurt myself(?: anymore)?\b",
        r"\bi do not want to hurt myself(?: anymore)?\b",
    )
    return any(re.search(pattern, text_lower) for pattern in exit_patterns)


def _llm_crisis_response(text: str) -> str:
    try:
        crisis_system_prompt = AIPrompt.objects.get(name="crisis_system_prompt").content
        return get_completion(
            messages=[
                {"role": "system", "content": crisis_system_prompt},
                {"role": "user", "content": text},
            ],
            max_tokens=300,
            temperature=0.7,
        )
    except Exception as error:
        logger.error("LLM crisis response failed: %s", str(error))
        raise LLMAPIError(f"LLM crisis call failed: {str(error)}")


def _llm_classify(text: str) -> str:
    try:
        emotion_classify_prompt = AIPrompt.objects.get(name="emotion_classify_prompt").content
        result = get_completion(
            messages=[
                {
                    "role": "user",
                    "content": emotion_classify_prompt.format(text=text),
                }
            ],
            max_tokens=50,
            temperature=0.0,
        ).strip().lower()

        if result not in ALLOWED_LABELS:
            raise EmotionClassificationError(f"LLM returned unexpected label: '{result}'")

        logger.info("LLM fallback classification: %s", result)
        return result
    except EmotionClassificationError:
        raise
    except Exception as error:
        logger.error("LLM emotion classification failed: %s", str(error))
        raise LLMAPIError(f"LLM call failed: {str(error)}")


def classify_emotion(text: str) -> dict:
    """
    Full pipeline: crisis check -> ML model -> LLM fallback.
    Returns: { emotion, emotion_confidence, is_crisis, message (crisis only) }
    """
    if check_crisis(text):
        logger.warning("Crisis keyword detected in message")
        try:
            message = _llm_crisis_response(text)
            return {
                "is_crisis": True,
                "emotion": "sad",
                "emotion_confidence": 1.0,
                "message": message,
            }
        except LLMAPIError:
            logger.warning("LLM unavailable during crisis - using fallback response")
            fallback_message = (
                AIPrompt.objects.get(name="crisis_fallback").content
                if AIPrompt.objects.filter(name="crisis_fallback").exists()
                else "Please contact a helpline immediately."
            )
            return {
                "is_crisis": True,
                "emotion": "sad",
                "emotion_confidence": 1.0,
                "message": fallback_message,
            }

    try:
        result = predict(text)
        emotion = str(result.get("emotion", "")).lower().strip()
        confidence = float(result.get("confidence", 0.0))

        # ML model is trained on 4 labels and can over-predict happy on neutral text.
        if emotion == "happy" and confidence < HAPPY_NEUTRAL_THRESHOLD:
            logger.info("ML predicted happy with low confidence (%.2f); mapping to neutral", confidence)
            return {
                "emotion": "neutral",
                "emotion_confidence": confidence,
                "is_crisis": False,
            }

        if emotion in ALLOWED_LABELS and confidence >= CONFIDENCE_THRESHOLD:
            logger.info("ML classification used: %s (%.2f)", emotion, confidence)
            return {
                "emotion": emotion,
                "emotion_confidence": confidence,
                "is_crisis": False,
            }

        logger.warning("ML confidence low (%.2f), falling back to LLM", confidence)
        llm_emotion = _llm_classify(text)
        return {
            "emotion": llm_emotion,
            "emotion_confidence": 1.0,
            "is_crisis": False,
        }
    except (LLMAPIError, EmotionClassificationError):
        raise
    except MLModelError as error:
        logger.error("ML model error: %s", str(error))
        raise
