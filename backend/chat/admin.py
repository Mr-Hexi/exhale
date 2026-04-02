from django.contrib import admin
from .models import Conversation, ChatMessage, AIPrompt

@admin.register(AIPrompt)
class AIPromptAdmin(admin.ModelAdmin):
    list_display = ("name", "emotion", "updated_at")
    list_filter = ("name", "emotion")
    search_fields = ("name", "emotion", "content")


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "title", "created_at")
    list_filter = ("user", "created_at")
    search_fields = ("title", "user__username")
    ordering = ("-created_at",)


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "emotion", "timestamp")
    list_filter = ("role", "emotion", "timestamp")
    search_fields = ("content", "conversation__user__username")
    ordering = ("-timestamp",)
