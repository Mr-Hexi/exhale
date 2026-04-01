from django.urls import path
from emotion.views import DetectEmotionView, EmotionSummaryView

urlpatterns = [
    path("detect/",  DetectEmotionView.as_view(),  name="emotion-detect"),
    path("summary/", EmotionSummaryView.as_view(), name="emotion-summary"),
]