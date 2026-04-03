from django.db import models
from pgvector.django import VectorField


class KnowledgeChunk(models.Model):
    CATEGORY_CHOICES = [
        ("cbt_technique",       "CBT Technique"),
        ("breathing_grounding", "Breathing / Grounding"),
        ("reflection_question", "Reflection Question"),
        ("psychoeducation",     "Psychoeducation"),
        ("insight",             "Insight"),
        ("reframe",             "Reframe"),
        ("validation",          "Validation"),
        ("perspective",         "Perspective"),
        ("question",            "Question"),
        ("technique",           "Technique"),
        ("crisis_resource",     "Crisis Resource"),
    ]

    content     = models.TextField()
    category    = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    emotion_tag = models.CharField(max_length=20, blank=True)
    embedding   = VectorField(dimensions=384)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"[{self.category}] {self.content[:60]}"
