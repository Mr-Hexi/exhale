from django.core.management.base import BaseCommand
from knowledge.models import KnowledgeChunk
from sentence_transformers import SentenceTransformer


CHUNKS = [
    # Insights
    {
        "content": "When anxiety spikes, your mind is usually trying to prepare for uncertainty, not proving that danger is certain.",
        "category": "insight",
        "emotion_tag": "anxious",
    },
    {
        "content": "Overthinking before interviews is often fear of judgment showing up, not a sign that you are incapable.",
        "category": "reframe",
        "emotion_tag": "anxious",
    },
    {
        "content": "Imagining worst-case outcomes before important events is common because the brain prefers a plan over uncertainty.",
        "category": "validation",
        "emotion_tag": "anxious",
    },
    {
        "content": "Sadness can flatten motivation, so low energy is often part of the feeling itself, not a character flaw.",
        "category": "insight",
        "emotion_tag": "sad",
    },
    {
        "content": "Anger usually points to a boundary that feels crossed, ignored, or unsafe.",
        "category": "insight",
        "emotion_tag": "angry",
    },
    {
        "content": "Self-doubt gets louder in high-stakes moments because the brain treats social evaluation like a survival threat.",
        "category": "insight",
        "emotion_tag": "anxious",
    },
    {
        "content": "Burnout is often a signal that your load has exceeded your recovery capacity for too long.",
        "category": "insight",
        "emotion_tag": "sad",
    },
    {
        "content": "Hopelessness often narrows your view to only what hurts right now and hides what is still possible.",
        "category": "reframe",
        "emotion_tag": "sad",
    },

    # Reframes and perspectives
    {
        "content": "Feeling anxious does not mean you are weak; it usually means something important matters to you.",
        "category": "reframe",
        "emotion_tag": "anxious",
    },
    {
        "content": "Needing rest is not giving up. It is maintenance for a tired nervous system.",
        "category": "reframe",
        "emotion_tag": "sad",
    },
    {
        "content": "Progress during difficult weeks can look like stabilizing, not improving.",
        "category": "perspective",
        "emotion_tag": "",
    },
    {
        "content": "A hard day does not cancel your abilities; it only describes your current emotional load.",
        "category": "reframe",
        "emotion_tag": "sad",
    },

    # Validations
    {
        "content": "It is common to feel exhausted and not good enough at the same time when stress has been building for weeks.",
        "category": "validation",
        "emotion_tag": "sad",
    },
    {
        "content": "Many people feel mentally noisy before major decisions. That does not mean they are making the wrong one.",
        "category": "validation",
        "emotion_tag": "anxious",
    },
    {
        "content": "It makes sense to feel frustrated when your effort is high but results are unclear.",
        "category": "validation",
        "emotion_tag": "angry",
    },
    {
        "content": "Feeling stuck does not mean you are broken. It usually means your current strategy is depleted.",
        "category": "validation",
        "emotion_tag": "sad",
    },

    # Questions
    {
        "content": "What part of this feels heaviest right now: pressure, fear of judgment, or pure exhaustion?",
        "category": "question",
        "emotion_tag": "anxious",
    },
    {
        "content": "If your closest friend said this about themselves, what would you want them to remember?",
        "category": "question",
        "emotion_tag": "sad",
    },
    {
        "content": "What is one demand you can soften this week so your energy can recover?",
        "category": "question",
        "emotion_tag": "sad",
    },
    {
        "content": "What has this feeling been trying to protect you from?",
        "category": "question",
        "emotion_tag": "angry",
    },

    # Techniques
    {
        "content": "Box breathing: inhale 4, hold 4, exhale 4, hold 4. Repeat for 4 rounds.",
        "category": "technique",
        "emotion_tag": "anxious",
    },
    {
        "content": "Use a two-column thought check: write your fear in one column and realistic evidence in the other.",
        "category": "technique",
        "emotion_tag": "anxious",
    },
    {
        "content": "Try a low-pressure reset: drink water, loosen your shoulders, and take one slow exhale longer than your inhale.",
        "category": "technique",
        "emotion_tag": "sad",
    },
    {
        "content": "Name one thing you can control in the next 10 minutes and one thing you can intentionally release for today.",
        "category": "technique",
        "emotion_tag": "anxious",
    },

    # Backward compatible legacy categories
    {
        "content": "Anxiety is your brain's alarm system. A sensitive alarm can ring even when danger is low.",
        "category": "psychoeducation",
        "emotion_tag": "anxious",
    },
    {
        "content": "What would feeling ten percent lighter look like in the next hour?",
        "category": "reflection_question",
        "emotion_tag": "sad",
    },
    {
        "content": "Behavioral activation: when feeling low, schedule one small enjoyable activity today, even 10 minutes.",
        "category": "cbt_technique",
        "emotion_tag": "sad",
    },
    {
        "content": "5-4-3-2-1 grounding: name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
        "category": "breathing_grounding",
        "emotion_tag": "angry",
    },

    # Crisis resources
    {
        "content": "iCall (India): 9152987821 - free, confidential counselling by trained professionals.",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
    {
        "content": "Vandrevala Foundation Helpline: 1860-2662-345 - available 24/7 across India.",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
    {
        "content": "International crisis resources: findahelpline.com - find a helpline in your country.",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
    {
        "content": "If you are in immediate danger, call local emergency services right away.",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
]


class Command(BaseCommand):
    help = "Seed or refresh the knowledge base with diverse chunks and embeddings"

    def handle(self, *args, **kwargs):
        self.stdout.write("Loading embedding model...")
        model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

        created = 0
        updated = 0
        self.stdout.write(f"Embedding and syncing {len(CHUNKS)} chunks...")

        for chunk in CHUNKS:
            embedding = model.encode(chunk["content"]).tolist()
            _, was_created = KnowledgeChunk.objects.update_or_create(
                content=chunk["content"],
                defaults={
                    "category": chunk["category"],
                    "emotion_tag": chunk["emotion_tag"],
                    "embedding": embedding,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {created} created, {updated} updated, total {len(CHUNKS)} synced."
            )
        )
