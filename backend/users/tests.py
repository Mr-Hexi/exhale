from django.test import TestCase

from users.serializers import RegisterSerializer


class RegisterSerializerTests(TestCase):
    def test_register_serializer_creates_user_with_normalized_email(self):
        serializer = RegisterSerializer(
            data={
                "username": "new_user",
                "email": "NewUser@Example.COM ",
                "password": "ComplexPass123!",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertEqual(user.email, "newuser@example.com")

    def test_register_serializer_rejects_duplicate_username(self):
        first = RegisterSerializer(
            data={
                "username": "taken_user",
                "email": "first@example.com",
                "password": "ComplexPass123!",
            }
        )
        self.assertTrue(first.is_valid(), first.errors)
        first.save()

        serializer = RegisterSerializer(
            data={
                "username": "taken_user",
                "email": "third@example.com",
                "password": "ComplexPass123!",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("username", serializer.errors)

    def test_register_serializer_rejects_duplicate_email_case_insensitive(self):
        first = RegisterSerializer(
            data={
                "username": "first_user",
                "email": "person@example.com",
                "password": "ComplexPass123!",
            }
        )
        self.assertTrue(first.is_valid(), first.errors)
        first.save()

        second = RegisterSerializer(
            data={
                "username": "second_user",
                "email": "PERSON@example.com",
                "password": "ComplexPass123!",
            }
        )
        self.assertFalse(second.is_valid())
        self.assertIn("email", second.errors)

    def test_register_serializer_uses_django_password_validators(self):
        serializer = RegisterSerializer(
            data={
                "username": "weak_password_user",
                "email": "weak@example.com",
                "password": "12345678",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)
