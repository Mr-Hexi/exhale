from django.db import migrations
from django.utils.text import slugify

def populate_default_topics(apps, schema_editor):
    Topic = apps.get_model('users', 'Topic')
    
    default_topics = [
        "Stress",
        "Anxiety",
        "Loneliness",
        "Depression",
        "Burnout",
        "Anger",
        "Grief",
        "Relationship Issues",
        "Low Self-Esteem",
        "Procrastination",
        "Overthinking",
        "Self-Discovery"
    ]
    
    for topic_name in default_topics:
        Topic.objects.get_or_create(
            name=topic_name,
            defaults={
                'slug': slugify(topic_name)
            }
        )

class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(populate_default_topics),
    ]
