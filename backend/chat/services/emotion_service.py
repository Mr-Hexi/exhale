import os
import logging
from groq import Groq
from emotion.ml.predict import predict
from emotion.exceptions import MLModelError, EmotionClassificationError
from chat.exceptions import GroqAPIError
from prompts.v1 import EMOTION_CLASSIFY_PROMPT          # ← changed

logger = logging.getLogger("exhale")

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

CONFIDENCE_THRESHOLD = 0.70
ALLOWED_LABELS = {"happy", "sad", "anxious", "angry"}

# EMOTION_CLASSIFY_PROMPT now lives in prompts/v1.py — do not redefine here

CRISIS_KEYWORDS = [
    "end it all", "kill myself", "want to die", "no reason to live",
    "hopeless", "can't go on", "don't want to be here", "suicidal",
    "hurt myself", "self harm", "worthless", "give up on life"
]

CRISIS_RESPONSE = {
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


def _groq_classify(text: str) -> str:
    try:
        response = client.chat.completions.create(
            model="llama3-8b-8192",
            messages=[{
                "role": "user",
                "content": EMOTION_CLASSIFY_PROMPT.format(text=text)
            }],
            max_tokens=10,
            temperature=0.0,
        )
        result = response.choices[0].message.content.strip().lower()

        if result not in ALLOWED_LABELS:
            raise EmotionClassificationError(
                f"Groq returned unexpected label: '{result}'"
            )

        logger.info("Groq fallback classification: %s", result)
        return result

    except EmotionClassificationError:
        raise
    except Exception as e:
        logger.error("Groq emotion classification failed: %s", str(e))
        raise GroqAPIError(f"Groq call failed: {str(e)}")


def classify_emotion(text: str) -> dict:
    """
    Full pipeline: crisis check → ML model → Groq fallback.
    Returns: { emotion, emotion_confidence, is_crisis }
    """
    if check_crisis(text):
        logger.warning("Crisis keyword detected in message")
        return CRISIS_RESPONSE

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
            "ML confidence low (%.2f), falling back to Groq", confidence
        )
        groq_emotion = _groq_classify(text)
        return {
            "emotion": groq_emotion,
            "emotion_confidence": confidence,
            "is_crisis": False,
        }

    except (GroqAPIError, EmotionClassificationError):
        raise
    except MLModelError as e:
        logger.error("ML model error: %s", str(e))
        raise