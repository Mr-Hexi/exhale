"""Core chatbot logic shared by CLI and LangGraph nodes."""

from __future__ import annotations

import re

from llm_client import LLMClient
from prompts import (
    ANTI_REPETITION_PROMPT,
    CRISIS_SYSTEM_PROMPT,
    EMOTION_CLASSIFY_PROMPT,
    EMOTION_PROMPTS,
    QUESTION_HANDLING_PROMPT,
    STAGE_PROMPTS,
    SYSTEM_PROMPT,
)

ALLOWED_EMOTIONS = {"happy", "sad", "anxious", "angry", "neutral"}
HAPPY_NEUTRAL_THRESHOLD = 0.60
CRISIS_KEYWORDS = (
    "kill myself", "suicide", "end my life", "hurt myself",
    "self harm", "cut myself", "die", "don't want to live",
    "do something bad to myself", "do something bad with myself",
    "i might hurt myself", "thinking of hurting myself"
)
EXISTENTIAL_QUESTION_PATTERNS = (
    "what's the point",
    "whats the point",
    "what is the point",
    "point of trying",
    "why try",
    "why bother",
    "does anything matter",
)
STAGE_KEYWORDS = {
    "burnout": (
        "burnout",
        "exhausted",
        "drained",
        "tired",
        "overwhelmed",
        "can't keep up",
        "too much",
        "mentally tired",
        "hard to focus",
        "small tasks feel heavy",
        "everything feels heavy",
    ),
    "hopelessness": (
        "hopeless",
        "stuck",
        "no point",
        "nothing will change",
        "can't go on",
        "what's the point",
        "why bother",
        "why try",
    ),
    "self_doubt": (
        "not good enough",
        "self doubt",
        "self-doubt",
        "imposter",
        "fear of judgment",
    ),
}
NUMBER_WORDS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
CONTEXT_LABELS = {
    "Insight",
    "Technique",
    "Perspective",
    "Question",
    "Validation",
    "Reframe",
    "Resource",
}
SAFE_EXIT_KEYWORDS = ["i'm okay", "i am fine", "feeling better"]


def should_exit_crisis(text: str) -> bool:
    text = text.lower().replace("’", "'")
    if any(k in text for k in SAFE_EXIT_KEYWORDS):
        return True

    exit_patterns = (
        r"\bfeeling (?:a bit |much )?better\b",
        r"\bi (?:do not|don't|am not|ain't) feel like i(?: am|'m)? going to hurt myself(?: anymore)?\b",
        r"\bi(?: am|'m)? not going to hurt myself(?: anymore)?\b",
        r"\bi (?:will not|won't) hurt myself(?: anymore)?\b",
        r"\bi do not want to hurt myself(?: anymore)?\b",
    )
    return any(re.search(pattern, text) for pattern in exit_patterns)


def persist_crisis(state):
    if state.get("previous_crisis"):
        return True
    return state.get("is_crisis", False)


def check_crisis(text: str) -> bool:
    text_lower = text.lower().replace("’", "'")

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

    for phrase in CRISIS_KEYWORDS:
        if phrase in text_lower:
            return True

    # soft detection (important)
    if "myself" in text_lower and any(word in text_lower for word in ["bad", "hurt", "harm"]):
        return True

    return False

def is_existential_question(text: str | None) -> bool:
    """Detect existential-question phrasing that needs direct answering.

    Args:
        text: User message or None.

    Returns:
        bool: True when message includes existential patterns.
    """
    if not text:
        return False
    text_lower = text.lower()
    return any(pattern in text_lower for pattern in EXISTENTIAL_QUESTION_PATTERNS)


def detect_stage(text: str, emotion: str | None) -> str:
    """Infer emotional stage from message text and primary emotion.

    Args:
        text: User message text.
        emotion: Previously classified emotion label.

    Returns:
        str: One of `burnout`, `hopelessness`, `self_doubt`, or `general`.
    """
    text_lower = text.lower()
    scores = {name: 0 for name in STAGE_KEYWORDS}

    # Keyword voting: whichever stage accumulates the most hits wins.
    for stage_name, keywords in STAGE_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                scores[stage_name] += 1

    best_stage = max(scores, key=scores.get)
    if scores[best_stage] > 0:
        return best_stage

    # Safety fallback for subtle hopelessness phrasing not in the keyword list.
    if emotion == "sad" and any(token in text_lower for token in ("stuck", "can't", "never", "nothing")):
        return "hopelessness"
    return "general"


# def parse_response_policy(current_text: str | None, user_history_texts: list[str] | None = None) -> dict:
#     """Extract response constraints from user directives.

#     Supported directives include:
#     - no-question mode
#     - max sentence count
#     - no extra prompt suggestions

#     Args:
#         current_text: Current user turn.
#         user_history_texts: Previous user-only utterances.

#     Returns:
#         dict: Policy object with keys `no_question`, `no_extra_prompt`,
#             and `max_sentences`.
#     """
#     entries = list(user_history_texts or [])
#     if current_text:
#         entries.append(current_text)

#     policy = {"no_question": False, "no_extra_prompt": False, "max_sentences": None}

#     # Iterate from oldest to newest so later directives naturally override earlier ones.
#     for text in entries:
#         lower = text.lower()
#         if any(t in lower for t in ("no question", "do not ask", "don't ask", "without question")):
#             policy["no_question"] = True
#         if any(t in lower for t in ("you can ask", "feel free to ask", "ask me a question")):
#             policy["no_question"] = False

#         if any(t in lower for t in ("no helpful prompt", "no extra prompt", "without extra prompt")):
#             policy["no_extra_prompt"] = True
#         if any(t in lower for t in ("helpful prompt is okay", "you can add prompt", "extra prompt is okay")):
#             policy["no_extra_prompt"] = False

#         digit_match = re.search(r"\b(?:exactly|only|just)?\s*(\d+)\s*(?:short\s*)?sentences?\b", lower)
#         word_match = re.search(
#             r"\b(?:exactly|only|just)?\s*(one|two|three|four|five)\s*(?:short\s*)?sentences?\b",
#             lower,
#         )
#         one_sentence_match = re.search(r"\bone sentence\b", lower)

#         if digit_match:
#             policy["max_sentences"] = max(1, min(int(digit_match.group(1)), 5))
#         elif word_match:
#             policy["max_sentences"] = NUMBER_WORDS[word_match.group(1)]
#         elif one_sentence_match:
#             policy["max_sentences"] = 1

#     return policy


# def enforce_response_policy(response: str, response_policy: dict | None) -> str:
#     """Apply deterministic post-processing constraints to model output.

#     Args:
#         response: Raw assistant text from the LLM.
#         response_policy: Policy dictionary from `parse_response_policy`.

#     Returns:
#         str: Sanitized assistant text honoring policy requirements.
#     """
#     if not response_policy:
#         return response.strip()

#     output = response.strip()
#     max_sentences = response_policy.get("max_sentences")
#     if isinstance(max_sentences, int) and max_sentences > 0:
#         sentences = re.split(r"(?<=[.!?]) +", output)
#         output = " ".join(sentences[:max_sentences]).strip()

#     if response_policy.get("no_question"):
#         output = output.replace("?", ".")
#         output = re.sub(r"\s+\.", ".", output)
#         output = re.sub(r"\.{2,}", ".", output).strip()

#     return output


def _classify_emotion_llm(client: LLMClient, text: str) -> str:
    """Classify primary emotion via LLM with constrained-label prompting.

    Args:
        client: Configured LLM client used to run classification prompt.
        text: User message text.

    Returns:
        str: One of allowed emotion labels. Falls back to `sad` if parsing fails.
    """
    candidate = client.completion(
        [{"role": "user", "content": EMOTION_CLASSIFY_PROMPT.format(text=text)}],
        max_tokens=20,
        temperature=0.0,
    ).strip().lower()
    return candidate if candidate in ALLOWED_EMOTIONS else "sad"


def classify_emotion(client: LLMClient, text: str, *, threshold: float = 0.70) -> tuple[str, float]:
    """Classify emotion using ML first, then fallback to LLM below confidence threshold.

    Args:
        client: Configured LLM client used as fallback classifier.
        text: User message text.
        threshold: Minimum ML confidence required to accept ML prediction.

    Returns:
        tuple[str, float]:
            - emotion label
            - confidence score (ML probability when used, otherwise 1.0 for LLM fallback)
    """
    try:
        from ml.predict import predict as predict_emotion

        prediction = predict_emotion(text)
        emotion = str(prediction.get("emotion", "")).lower().strip()
        confidence = float(prediction.get("confidence", 0.0))

        # ML model is trained on 4 labels and may over-predict "happy" for neutral text.
        if emotion == "happy" and confidence < HAPPY_NEUTRAL_THRESHOLD:
            return "neutral", confidence

        if emotion in ALLOWED_EMOTIONS and confidence >= threshold:
            return emotion, confidence
    except Exception:
        # Any model loading/prediction issue falls back to LLM classification.
        pass
    print("[debug] ML emotion classification failed or below threshold, using LLM fallback.")
    return _classify_emotion_llm(client, text), 1.0


def _format_context_block(context: list[str] | None) -> str:
    """Normalize retrieval snippets into a stable prompt block.

    Args:
        context: Retrieved chunk lines (already labeled or raw).

    Returns:
        str: Multiline bullet block inserted into the system prompt.
    """
    if not context:
        return ""
    lines: list[str] = []
    for raw_item in context:
        if not raw_item:
            continue
        item = raw_item.strip()
        if not item:
            continue
        label = item.split(":", 1)[0].strip()
        if label in CONTEXT_LABELS and ":" in item:
            lines.append(f"- {item}")
        else:
            lines.append(f"- Insight: {item}")
    if not lines:
        return ""
    return "Relevant insights and support patterns:\n" + "\n".join(lines)


def build_messages(
    *,
    current_text: str,
    emotion: str,
    stage: str,
    history: list[dict[str, str]],
    is_crisis: bool,
    context: list[str] | None = None,
) -> list[dict[str, str]]:

    messages = []

    if is_crisis:
        system_prompt = CRISIS_SYSTEM_PROMPT + """

STRICT RULES:
- Do NOT ask "why", "what caused", or "what triggered"
- Do NOT use intimate terms like "sweetheart" or "dear"
- ALWAYS include support resources directly
- Keep tone calm, grounded, and supportive
"""
    else:
        emotion_prompt = EMOTION_PROMPTS.get(emotion, "")
        stage_prompt = STAGE_PROMPTS.get(stage, STAGE_PROMPTS["general"])

        system_prompt = (
            f"{SYSTEM_PROMPT}\n\n"
            f"{emotion_prompt}\n\n"
            f"{stage_prompt}\n\n"
            f"{ANTI_REPETITION_PROMPT}"
        )

    # ── CONTEXT ─────────────────────────────
    if context and not is_crisis:
        context_block = "\n".join(f"- {c}" for c in context)
        system_prompt += f"""

CONTEXT BLOCK:
{context_block}

Use this as supporting perspective. Do not repeat patterns.
"""

    messages.append({"role": "system", "content": system_prompt})

    # No question prompt in crisis
    if not is_crisis:
        if "?" in current_text or is_existential_question(current_text):
            messages.append({
                "role": "system",
                "content": QUESTION_HANDLING_PROMPT
            })

    #  HISTORY 
    messages.extend(history[-6:])

    # USER 
    messages.append({"role": "user", "content": current_text})

    return messages
    
    
    '''
    example Output:
    
    [
  {
    "role": "system",
    "content": "You are a supportive mental health assistant. Be empathetic and helpful.\n\nRespond with empathy and validation. Acknowledge the user's feelings gently.\n\nFocus on exhaustion and overwhelm. Normalize their experience and suggest small manageable steps.\n\nAvoid repeating phrases or generic advice. Keep responses fresh.\n\nCONTEXT BLOCK:\nRelevant insights and support patterns:\n- Insight: Take small breaks to reset your energy\n- Technique: Try 4-7-8 breathing\n- Perspective: Burnout often comes from prolonged stress\n\nUse this block as supporting perspective and avoid repeating the same pattern."
  },
  {
    "role": "user",
    "content": "Work has been overwhelming lately"
  },
  {
    "role": "assistant",
    "content": "That sounds really draining. Want to share more about what's been hardest?"
  },
  {
    "role": "user",
    "content": "I feel exhausted and like I can't keep up anymore"
  }
]
    '''
    
    return messages
