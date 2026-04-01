import logging
from services.llm_client import get_completion
from emotion.ml.predict import predict
from emotion.exceptions import MLModelError, EmotionClassificationError
from chat.exceptions import GroqAPIError
from prompts.v1 import EMOTION_CLASSIFY_PROMPT, CRISIS_SYSTEM_PROMPT

logger = logging.getLogger("exhale")

CONFIDENCE_THRESHOLD = 0.70
ALLOWED_LABELS = {"happy", "sad", "anxious", "angry"}

CRISIS_KEYWORDS = [
    "end it all", "kill myself", "want to die", "no reason to live",
    "hopeless", "can't go on", "don't want to be here", "suicidal",
    "hurt myself", "self harm", "worthless", "give up on life"
]

CRISIS_RESPONSE_FALLBACK = {
    "is_crisis": True,
    "emotion": "sad",
    "emotion_confidence": 1.0,
    "message": (
        "I'm really concerned about what you've shared. "
        "Please know you're not alone. "
        "If you're in distress, please reach out to a crisis helpline:\n\n"
        "iCall (India): 9152987821\n"
        "Vandrevala Foundation: 1860-2662-345 (24/7)\n"
        "International: findahelpline.com\n\n"
        "I'm here with you. Would you like to talk about what's going on?"
    ),
}


def check_crisis(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in CRISIS_KEYWORDS)


def _llm_crisis_response(text: str) -> str:
    try:
        return get_completion(
            messages=[
                {"role": "system", "content": CRISIS_SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            max_tokens=300,
            temperature=0.7,
        )
    except Exception as e:
        logger.error("LLM crisis response failed: %s", str(e))
        raise GroqAPIError(f"LLM crisis call failed: {str(e)}")


def _llm_classify(text: str) -> str:
    try:
        result = get_completion(
            messages=[{
                "role": "user",
                "content": EMOTION_CLASSIFY_PROMPT.format(text=text),
            }],
            max_tokens=10,
            temperature=0.0,
        ).lower()

        if result not in ALLOWED_LABELS:
            raise EmotionClassificationError(
                f"LLM returned unexpected label: '{result}'"
            )

        logger.info("LLM fallback classification: %s", result)
        return result

    except EmotionClassificationError:
        raise
    except Exception as e:
        logger.error("LLM emotion classification failed: %s", str(e))
        raise GroqAPIError(f"LLM call failed: {str(e)}")


def classify_emotion(text: str) -> dict:
    """
    Full pipeline: crisis check → ML model → LLM fallback.
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
        except GroqAPIError:
            logger.warning("LLM unavailable during crisis — using fallback response")
            return CRISIS_RESPONSE_FALLBACK

    try:
        result = predict(text)
        confidence = result["confidence"]

        if confidence >= CONFIDENCE_THRESHOLD:
            logger.info(
                "ML classification used: %s (%.2f)", result["emotion"], confidence
            )
            return {
                "emotion": result["emotion"],
                "emotion_confidence": confidence,
                "is_crisis": False,
            }

        logger.warning(
            "ML confidence low (%.2f), falling back to LLM", confidence
        )
        llm_emotion = _llm_classify(text)
        return {
            "emotion": llm_emotion,
            "emotion_confidence": confidence,
            "is_crisis": False,
        }

    except (GroqAPIError, EmotionClassificationError):
        raise
    except MLModelError as e:
        logger.error("ML model error: %s", str(e))
        raise