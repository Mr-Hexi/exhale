from django.core.management.base import BaseCommand
from knowledge.models import KnowledgeChunk
from sentence_transformers import SentenceTransformer

CHUNKS = [
    # --- CBT Techniques ---
    {
        "content": "Challenge negative thoughts by asking: Is this thought based on facts or feelings? What evidence do I have for and against it?",
        "category": "cbt_technique",
        "emotion_tag": "anxious",
    },
    {
        "content": "Try a thought record: write down the situation, your automatic thought, the emotion it caused, and a more balanced alternative thought.",
        "category": "cbt_technique",
        "emotion_tag": "anxious",
    },
    {
        "content": "Behavioural activation: when feeling low, schedule one small enjoyable activity today — even 10 minutes counts.",
        "category": "cbt_technique",
        "emotion_tag": "sad",
    },
    {
        "content": "Identify cognitive distortions: are you catastrophising, mind-reading, or all-or-nothing thinking? Naming the pattern weakens its hold.",
        "category": "cbt_technique",
        "emotion_tag": "angry",
    },

    # --- Breathing & Grounding ---
    {
        "content": "Box Breathing (4-4-4-4): Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times.",
        "category": "breathing_grounding",
        "emotion_tag": "anxious",
    },
    {
        "content": "5-4-3-2-1 Grounding: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.",
        "category": "breathing_grounding",
        "emotion_tag": "angry",
    },
    {
        "content": "Diaphragmatic breathing: place one hand on your chest, one on your belly. Breathe so only the belly hand rises. Slow your exhale to twice the length of your inhale.",
        "category": "breathing_grounding",
        "emotion_tag": "anxious",
    },
    {
        "content": "Cold water grounding: splash cold water on your face or hold an ice cube briefly. It activates the dive reflex and slows your heart rate.",
        "category": "breathing_grounding",
        "emotion_tag": "angry",
    },

    # --- Reflection Questions ---
    {
        "content": "What is one small thing that brought you comfort recently, even briefly?",
        "category": "reflection_question",
        "emotion_tag": "sad",
    },
    {
        "content": "Is there one part of this worry that you do have some control over?",
        "category": "reflection_question",
        "emotion_tag": "anxious",
    },
    {
        "content": "What would you say to a close friend who was feeling exactly what you're feeling right now?",
        "category": "reflection_question",
        "emotion_tag": "sad",
    },
    {
        "content": "What do you think caused this feeling today? Is there a pattern you've noticed before?",
        "category": "reflection_question",
        "emotion_tag": "angry",
    },
    {
        "content": "What is going well right now, even if it feels small?",
        "category": "reflection_question",
        "emotion_tag": "happy",
    },

    # --- Psychoeducation ---
    {
        "content": "Anxiety is your brain's alarm system — it evolved to protect you. When it fires too often, it doesn't mean danger is real, it means the alarm is sensitive.",
        "category": "psychoeducation",
        "emotion_tag": "anxious",
    },
    {
        "content": "Sadness is a normal human emotion, not a sign of weakness. Allowing yourself to feel it fully is often the fastest way through it.",
        "category": "psychoeducation",
        "emotion_tag": "sad",
    },
    {
        "content": "Anger is often a secondary emotion — underneath it is usually hurt, fear, or a sense of injustice. Exploring what's beneath it can help.",
        "category": "psychoeducation",
        "emotion_tag": "angry",
    },
    {
        "content": "Emotions are temporary. Research shows most emotional peaks last 90 seconds neurologically — it's the thoughts we attach that extend them.",
        "category": "psychoeducation",
        "emotion_tag": "",
    },

    # --- Crisis Resources ---
    {
        "content": "iCall (India): 9152987821 — free, confidential counselling by trained professionals.",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
    {
        "content": "Vandrevala Foundation Helpline: 1860-2662-345 — available 24/7 across India.",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
    {
        "content": "International crisis resources: findahelpline.com — find a helpline in your country.",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
    {
        "content": "If you are in immediate danger, please call your local emergency services (112 in India).",
        "category": "crisis_resource",
        "emotion_tag": "",
    },
]


class Command(BaseCommand):
    help = "Seed the knowledge base with chunks and embeddings"

    def handle(self, *args, **kwargs):
        self.stdout.write("Loading embedding model...")
        model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

        existing = KnowledgeChunk.objects.count()
        if existing > 0:
            self.stdout.write(
                self.style.WARNING(f"{existing} chunks already exist. Skipping seed.")
            )
            return

        self.stdout.write(f"Embedding and saving {len(CHUNKS)} chunks...")

        for chunk in CHUNKS:
            embedding = model.encode(chunk["content"]).tolist()
            KnowledgeChunk.objects.create(
                content=chunk["content"],
                category=chunk["category"],
                emotion_tag=chunk["emotion_tag"],
                embedding=embedding,
            )

        self.stdout.write(self.style.SUCCESS(f"Done. {len(CHUNKS)} chunks seeded."))