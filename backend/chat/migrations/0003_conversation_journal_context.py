from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("chat", "0002_aiprompt"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="journal_context",
            field=models.TextField(blank=True, default=""),
        ),
    ]
