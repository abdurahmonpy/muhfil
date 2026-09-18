import uuid
import re
import string
import secrets
from django.db import models
from django.conf import settings
from django.utils.text import slugify


BASE62_ALPHABET = string.digits + string.ascii_letters


def generate_youtube_style_slug(post_id=None):
    """
    Generates an 11-character YouTube-style alphanumeric video ID from a UUID.
    Example output: 'dQw4w9WgXcQ', 'ez0nSncTCdQ', '6EYB5fQQ72F'
    """
    if not post_id:
        post_id = uuid.uuid4()
    elif isinstance(post_id, str):
        try:
            post_id = uuid.UUID(post_id)
        except Exception:
            post_id = uuid.uuid4()

    num = int.from_bytes(post_id.bytes[:8], 'big')
    chars = []
    while num:
        num, rem = divmod(num, 62)
        chars.append(BASE62_ALPHABET[rem])

    return ''.join(reversed(chars)).zfill(11)


class Tag(models.Model):
    name = models.CharField(max_length=64, unique=True)
    slug = models.SlugField(max_length=80, unique=True, blank=True)
    followers = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='followed_tags',
        blank=True
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.name) or 'tag'
            slug = base_slug
            counter = 1
            while Tag.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Post(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('published', 'Published'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='posts'
    )
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=350, blank=True)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    text = models.TextField(help_text="Rich HTML content of the story")
    plain_text = models.TextField(blank=True, help_text="Plain text version for search and previews")
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='published')
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True)
    cover_url = models.URLField(max_length=500, blank=True)
    tags = models.ManyToManyField(Tag, related_name='posts', blank=True)
    read_time = models.PositiveIntegerField(default=1, help_text="Reading time in minutes")
    views_count = models.PositiveIntegerField(default=0)
    reads_count = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created']

    def total_claps(self):
        return self.claps.aggregate(total=models.Sum('count'))['total'] or 0

    def comments_count(self):
        return self.comments.count()

    def get_cover(self):
        if self.cover_image:
            try:
                return self.cover_image.url
            except Exception:
                pass
        if self.cover_url:
            return self.cover_url
        return 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=500&fit=crop'

    def save(self, *args, **kwargs):
        if not self.slug or len(self.slug) != 11 or not self.slug.isalnum():
            code = generate_youtube_style_slug(self.id)
            while Post.objects.filter(slug=code).exclude(pk=self.pk).exists():
                code = ''.join(secrets.choice(BASE62_ALPHABET) for _ in range(11))
            self.slug = code

        # Calculate read time based on word count
        raw_content = self.plain_text or re.sub(r'<[^>]+>', ' ', self.text or '')
        words = len(raw_content.split())
        self.read_time = max(1, (words + 199) // 200)

        super().save(*args, **kwargs)

    def get_absolute_url(self):
        from django.urls import reverse
        return reverse('story_detail', kwargs={'slug': self.slug})

    @property
    def read_time_minutes(self):
        return self.read_time

    def __str__(self):
        return self.title


class Clap(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='claps')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='claps')
    count = models.PositiveIntegerField(default=1)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user} clapped {self.count} times on {self.post.title}"


class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    text = models.TextField()
    claps_count = models.PositiveIntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created']

    def __str__(self):
        return f"Comment by {self.user} on {self.post.title}"


class Bookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarks')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='bookmarks')
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')
        ordering = ['-created']

    def __str__(self):
        return f"{self.user} bookmarked {self.post.title}"


class StoryList(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='story_lists')
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    is_private = models.BooleanField(default=False)
    posts = models.ManyToManyField(Post, related_name='contained_in_lists', blank=True)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created']

    def __str__(self):
        return f"{self.name} by {self.user}"


class Notification(models.Model):
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='actions'
    )
    verb = models.CharField(max_length=255)
    target_post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.actor} {self.verb} -> {self.recipient}"

