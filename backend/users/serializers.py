from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()
Topic = User.topics.rel.model if hasattr(User.topics, 'rel') else User.topics.field.related_model # Reliable way to get Topic model without circular import

class TopicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ['id', 'name', 'slug']

class UserProfileSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True, read_only=True)
    topic_ids = serializers.PrimaryKeyRelatedField(
        queryset=Topic.objects.all(), 
        source='topics', 
        many=True, 
        write_only=True,
        required=False
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'nickname', 'age_range', 'topics', 'topic_ids']
        read_only_fields = ['id', 'username', 'email']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Username already taken.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Email already registered.")
        return value

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )