from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    bio = models.TextField(blank=True, default='')
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    following = models.ManyToManyField(
        'self',
        symmetrical=False,
        related_name='followers',
        blank=True
    )
    membership_tier = models.CharField(max_length=50, default='Free Member')
    license = models.CharField(max_length=100, default='All Rights Reserved')
    email_digest = models.BooleanField(default=True)
    social_activity_notifications = models.BooleanField(default=True)

    @property
    def profile(self):
        """Allows templates to access request.user.profile.avatar seamlessly."""
        return self

    def get_avatar_url(self):
        if self.avatar:
            try:
                return self.avatar.url
            except Exception:
                return ''
        return ''

    def get_display_name(self):
        full_name = self.get_full_name().strip()
        return full_name if full_name else self.username

    @property
    def follower_count(self):
        return self.followers.count()

    @property
    def following_count(self):
        return self.following.count()

    def __str__(self):
        return self.username