from django.db import models
from django.conf import settings


class Conversation(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    title = models.CharField(max_length=255, default="New Chat")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Conversation({self.id}) — {self.user_id}"


class   ChatMessage(models.Model):
    class Role(models.TextChoices):
        USER = "user", "User"
        ASSISTANT = "assistant", "Assistant"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chat_messages",
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    content = models.TextField()
    role = models.CharField(max_length=20, choices=Role.choices)
    emotion = models.CharField(max_length=20, blank=True, null=True)
    emotion_confidence = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"ChatMessage({self.id}) — {self.role} in conv {self.conversation_id}"



class AIPrompt(models.Model):
    # Example names: "base_system_prompt", "crisis_system_prompt", "emotion_prompt"
    name = models.CharField(max_length=50)
    
    # Example emotions: "sad", "anxious", "happy", "angry"
    emotion = models.CharField(max_length=50, blank=True, null=True)
    
    # The actual prompt wording or JSON for a smart action
    content = models.TextField()
    
    # Metadata
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'emotion')

    def __str__(self):
        if self.emotion:
            return f"{self.name} - {self.emotion}"
        return self.name
