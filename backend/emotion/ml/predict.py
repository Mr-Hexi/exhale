import os
import joblib
import logging
from emotion.exceptions import MLModelError

logger = logging.getLogger("exhale")

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

# Load once at import time
try:
    _pipeline = joblib.load(MODEL_PATH)
    logger.info("Emotion model loaded successfully from %s", MODEL_PATH)
except FileNotFoundError:
    _pipeline = None
    logger.error("model.pkl not found at %s", MODEL_PATH)

ALLOWED_LABELS = {"happy", "sad", "anxious", "angry"}

def predict(text: str) -> dict:
    """
    Returns { "emotion": str, "confidence": float }
    Raises MLModelError if model is missing or prediction fails.
    """
    if _pipeline is None:
        raise MLModelError("Emotion model is not loaded. model.pkl missing.")

    if not text or not text.strip():
        raise MLModelError("Cannot predict emotion on empty text.")

    try:
        proba = _pipeline.predict_proba([text])[0]
        classes = _pipeline.classes_
        max_idx = proba.argmax()
        emotion = str(classes[max_idx])
        confidence = float(proba[max_idx])

        if emotion not in ALLOWED_LABELS:
            raise MLModelError(f"Model returned unexpected label: {emotion}")

        logger.info("ML prediction: %s (confidence: %.2f)", emotion, confidence)
        return {"emotion": emotion, "confidence": confidence}

    except MLModelError:
        raise
    except Exception as e:
        logger.error("Prediction failed: %s", str(e))
        raise MLModelError(f"Prediction error: {str(e)}")