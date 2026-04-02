from django.urls import path
from .views import JournalListCreateView, JournalDetailView, JournalInsightView

urlpatterns = [
    path("", JournalListCreateView.as_view(), name="journal-list-create"),
    path("<int:entry_id>/", JournalDetailView.as_view(), name="journal-detail"),
    path("<int:entry_id>/insight/", JournalInsightView.as_view(), name="journal-insight"),
]