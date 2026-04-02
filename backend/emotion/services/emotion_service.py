import logging
from services.llm_client import get_completion
from emotion.ml.predict import predict
from emotion.exceptions import MLModelError, EmotionClassificationError
from chat.exceptions import LLMAPIError
from chat.models import AIPrompt

logger = logging.getLogger("exhale")

CONFIDENCE_THRESHOLD = 0.70
ALLOWED_LABELS = {"happy", "sad", "anxious", "angry"}

CRISIS_KEYWORDS = [
    "end it all", "kill myself", "want to die", "no reason to live",
    "hopeless", "can't go on", "don't want to be here", "suicidal",
    "hurt myself", "self harm", "worthless", "give up on life"
]




def check_crisis(text: str) -> bool:
    text_lower = text.lower()
    return any(kw in text_lower for kw in CRISIS_KEYWORDS)


def _llm_crisis_response(text: str) -> str:
    try:
        crisis_system_prompt = AIPrompt.objects.get(name="crisis_system_prompt").content
        return get_completion(
            messages=[
                {"role": "system", "content": crisis_system_prompt},
                {"role": "user", "content": text},
            ],
            max_tokens=300,        # ← was 10, needs to generate a full response
            temperature=0.7,
        )
    except Exception as e:
        logger.error("LLM crisis response failed: %s", str(e))
        raise LLMAPIError(f"LLM crisis call failed: {str(e)}")


def _llm_classify(text: str) -> str:
    try:
        emotion_classify_prompt = AIPrompt.objects.get(name="emotion_classify_prompt").content
        result = get_completion(
            messages=[{
                "role": "user",
                "content": emotion_classify_prompt.format(text=text),
            }],
            max_tokens=50,         # ← was 10, bumped to handle leading whitespace/newline
            temperature=0.0,
        ).strip().lower()          # ← strip before lower to catch leading whitespace

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
        raise LLMAPIError(f"LLM call failed: {str(e)}")


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
        except LLMAPIError:
            logger.warning("LLM unavailable during crisis — using fallback response")
            fallback_message = AIPrompt.objects.get(name="crisis_fallback").content if AIPrompt.objects.filter(name="crisis_fallback").exists() else "Please contact a helpline immediately."
            return {
                "is_crisis": True,
                "emotion": "sad",
                "emotion_confidence": 1.0,
                "message": fallback_message,
            }

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

    except (LLMAPIError, EmotionClassificationError):
        raise
    except MLModelError as e:
        logger.error("ML model error: %s", str(e))
        raise