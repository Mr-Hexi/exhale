from django.urls import path
from chat.views import (
    ConversationListCreateView,
    ConversationDetailView,
    SendMessageView,
    ChatHistoryView,
    ClearChatView,
)

urlpatterns = [
    path("conversations/",                 ConversationListCreateView.as_view()),
    path("conversations/<int:conversation_id>/", ConversationDetailView.as_view()),
    path("<int:conversation_id>/send/",    SendMessageView.as_view()),
    path("<int:conversation_id>/history/", ChatHistoryView.as_view()),
    path("<int:conversation_id>/clear/",   ClearChatView.as_view()),
]