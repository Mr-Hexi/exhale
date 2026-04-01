from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class Topic(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name


class AgeRange(models.TextChoices):
    UNDER_18 = "under_18", "Under 18"
    AGE_18_24 = "18_24", "18–24"
    AGE_25_34 = "25_34", "25–34"
    AGE_35_44 = "35_44", "35–44"
    AGE_45_PLUS = "45_plus", "45+"
    
class User(AbstractUser):
    email = models.EmailField(unique=True)
    nickname = models.CharField(max_length=50, blank=True)
    age_range = models.CharField(
    max_length=20,
    choices=AgeRange.choices,
    blank=True
)
    topics = models.ManyToManyField(
    Topic,
    blank=True,
    related_name="users"
)    


    def __str__(self):
        return self.nickname or self.username