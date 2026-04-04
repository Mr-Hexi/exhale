import re

BAD_PATTERNS = [
    r"why do you",
    r"what caused",
    r"what triggered",
    r"what do you mean",
    r"tell me why",
]

def enforce_crisis_safety(text: str) -> str:
    lower = text.lower()

    #  Remove probing questions
    for pattern in BAD_PATTERNS:
        if re.search(pattern, lower):
            text = re.sub(r"[^.]*\?\s*", "", text)

    #Remove unsafe language
    text = text.replace("sweetheart", "")
    text = text.replace("dear", "")

    return text.strip()