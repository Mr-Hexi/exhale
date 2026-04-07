# """
# check_openrouter.py — Standalone OpenRouter API checker
# Run: python check_openrouter.py
# """

# import os
# import sys

# # ── Config — paste your key here or set OPENROUTER_API_KEY in env ──
# API_KEY = os.getenv("OPENROUTER_API_KEY", "YOUR_OPENROUTER_API_KEY")
# MODELS_TO_TEST = [
#     "qwen/qwen3-coder:free",
#     "meta-llama/llama-3.1-8b-instruct:free",
#     "stepfun/step-3.5-flash:free",
# ]

# TEST_PROMPT = (
#     "You must reply with exactly one word. "
#     "Choose the emotion from: happy, sad, anxious, angry.\n"
#     "Text: I feel really overwhelmed and stressed today.\n"
#     "Emotion:"
# )


# def check_model(client, model: str) -> None:
#     print(f"\n{'─'*55}")
#     print(f"  Model : {model}")
#     print(f"{'─'*55}")

#     try:
#         response = client.chat.completions.create(
#             model=model,
#             messages=[{"role": "user", "content": TEST_PROMPT}],
#             max_tokens=50,
#             temperature=0.0,
#         )

#         choice = response.choices[0]
#         content = choice.message.content
#         finish = choice.finish_reason

#         print(f"  finish_reason : {finish}")
#         print(f"  raw content   : {repr(content)}")

#         if content is None:
#             print("  ❌ FAIL — content is None (model likely rate-limited or broken)")
#         elif finish == "length":
#             print("  ⚠️  WARN — stopped at max_tokens, try increasing max_tokens")
#         else:
#             cleaned = content.strip().lower()
#             ALLOWED = {"happy", "sad", "anxious", "angry"}
#             # extract first word only
#             first_word = cleaned.split()[0] if cleaned.split() else ""
#             import re
#             first_word = re.sub(r"[^a-z]", "", first_word)
#             if first_word in ALLOWED:
#                 print(f"  ✅ PASS — label: '{first_word}'")
#             else:
#                 print(f"  ⚠️  WARN — unexpected label: '{first_word}' (full: {repr(cleaned)})")

#         # Show token usage if available
#         if hasattr(response, "usage") and response.usage:
#             u = response.usage
#             print(f"  tokens        : prompt={u.prompt_tokens}, completion={u.completion_tokens}")

#     except Exception as e:
#         print(f"  ❌ ERROR — {type(e).__name__}: {e}")


# def main():
#     print("\n========================================")
#     print("  OpenRouter API Checker")
#     print("========================================")

#     if API_KEY == "YOUR_KEY_HERE":
#         print("\n❌ Set your API key:")
#         print("   export OPENROUTER_API_KEY=sk-or-...")
#         print("   or edit API_KEY at the top of this script")
#         sys.exit(1)

#     try:
#         from openai import OpenAI
#     except ImportError:
#         print("\n❌ openai package not installed. Run: pip install openai")
#         sys.exit(1)

#     client = OpenAI(
#         base_url="https://openrouter.ai/api/v1",
#         api_key=API_KEY,
#     )

#     print(f"\n  Testing {len(MODELS_TO_TEST)} model(s)...\n")

#     for model in MODELS_TO_TEST:
#         check_model(client, model)

#     print(f"\n{'─'*55}")
#     print("  Done. Use a ✅ PASS model as your LLM_MODEL in .env")
#     print(f"{'─'*55}\n")


# if __name__ == "__main__":
#     main()


import os

from openai import OpenAI


api_key = os.getenv("OPENROUTER_API_KEY")
if not api_key:
    raise RuntimeError("Set OPENROUTER_API_KEY before running this script.")

# Initialize the client using the environment variable instead of a hardcoded secret.
client = OpenAI(
    api_key=api_key,
    base_url="https://openrouter.ai/api/v1",
    # Optional headers for rankings on the OpenRouter site:
    # default_headers={
    #     "HTTP-Referer": "https://your-app-url.com",
    #     "X-Title": "Your App Name",
    # },
)

response = client.chat.completions.create(
    model="stepfun/step-3.5-flash:free",
    messages=[
        {"role": "user", "content": "What is the easiest way to use OpenRouter with the OpenAI library?"}
    ],
    temperature=0.7,
)

print(response.choices[0].message.content)
