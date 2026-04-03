from django.contrib import admin
from .models import MoodLog, MoodInsightCache
# Register your models here.


admin.site.register(MoodLog)
admin.site.register(MoodInsightCache)
