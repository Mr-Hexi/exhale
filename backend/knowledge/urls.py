from django.urls import path
from knowledge.views import KnowledgeSearchView

urlpatterns = [
    path("search/", KnowledgeSearchView.as_view(), name="knowledge-search"),
]