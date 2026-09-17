from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.urls import reverse
from .models import Tag, Post, Clap, Comment, Bookmark, StoryList, Notification


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    fields = ('user', 'text', 'claps_count', 'created')
    readonly_fields = ('created',)
    show_change_link = True


class ClapInline(admin.TabularInline):
    model = Clap
    extra = 0
    fields = ('user', 'count', 'created')
    readonly_fields = ('created',)
    show_change_link = True


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = (
        'cover_thumbnail',
        'title',
        'author',
        'status_badge',
        'read_time_display',
        'views_count',
        'claps_count_display',
        'comments_count_display',
        'created'
    )
    list_display_links = ('cover_thumbnail', 'title')
    list_filter = ('status', 'tags', 'created')
    search_fields = ('title', 'subtitle', 'plain_text', 'author__username', 'author__email')
    prepopulated_fields = {'slug': ('title',)}
    filter_horizontal = ('tags',)
    date_hierarchy = 'created'
    ordering = ('-created',)
    inlines = [CommentInline, ClapInline]

    fieldsets = (
        ('Asosiy Ma\'lumotlar', {
            'fields': ('title', 'subtitle', 'slug', 'author', 'status')
        }),
        ('Maqola Mazmuni va Teglar', {
            'fields': ('text', 'plain_text', 'tags')
        }),
        ('Muqova Rasmi', {
            'fields': ('cover_image', 'cover_url', 'cover_large')
        }),
        ('Statistika va Metrikalar', {
            'fields': ('read_time', 'views_count', 'reads_count', 'total_claps_display', 'created', 'updated'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ('cover_large', 'read_time', 'views_count', 'reads_count', 'total_claps_display', 'created', 'updated')

    actions = ['make_published', 'make_draft']

    @admin.display(description='Muqova')
    def cover_thumbnail(self, obj):
        url = obj.get_cover()
        if url:
            return format_html(
                '<img src="{}" style="width:52px;height:36px;border-radius:4px;object-fit:cover;border:1px solid rgba(255,255,255,0.15);" />',
                url
            )
        return "Yo'q"

    @admin.display(description='Muqova Rasmi')
    def cover_large(self, obj):
        url = obj.get_cover()
        if url:
            return format_html(
                '<img src="{}" style="max-width:320px;height:auto;border-radius:8px;border:1px solid #334155;box-shadow:0 4px 12px rgba(0,0,0,0.2);" />',
                url
            )
        return "Muqova mavjud emas"

    @admin.display(description='Holati')
    def status_badge(self, obj):
        if obj.status == 'published':
            return mark_safe('<span style="background:#15803d;color:#ffffff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;"><i class="fas fa-check"></i> Chop etilgan</span>')
        return mark_safe('<span style="background:#b45309;color:#ffffff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;"><i class="fas fa-pencil-alt"></i> Qoralama</span>')

    @admin.display(description='O\'qish vaqti')
    def read_time_display(self, obj):
        return f"{obj.read_time} daq"

    @admin.display(description='Qarsaklar (Claps)')
    def claps_count_display(self, obj):
        return format_html('<b>👏 {}</b>', obj.total_claps())

    @admin.display(description='Sharhlar')
    def comments_count_display(self, obj):
        return format_html('💬 {}', obj.comments_count())

    @admin.display(description='Umumiy Qarsaklar')
    def total_claps_display(self, obj):
        return f"{obj.total_claps()} ta"

    @admin.action(description='Tanlangan maqolalarni chop etish (Publish)')
    def make_published(self, request, queryset):
        updated = queryset.update(status='published')
        self.message_user(request, f"{updated} ta maqola chop etildi.")

    @admin.action(description='Tanlangan maqolalarni qoralamaga o\'tkazish (Draft)')
    def make_draft(self, request, queryset):
        updated = queryset.update(status='draft')
        self.message_user(request, f"{updated} ta maqola qoralamaga o'tkazildi.")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'post_count_display', 'followers_count_display', 'created')
    search_fields = ('name', 'slug')
    prepopulated_fields = {'slug': ('name',)}
    ordering = ('name',)

    @admin.display(description='Maqolalar soni')
    def post_count_display(self, obj):
        return obj.posts.count()

    @admin.display(description='Obunachilar soni')
    def followers_count_display(self, obj):
        return obj.followers.count()


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'post_link', 'parent', 'short_text', 'claps_count', 'created')
    list_filter = ('created',)
    search_fields = ('user__username', 'post__title', 'text')
    ordering = ('-created',)

    @admin.display(description='Maqola')
    def post_link(self, obj):
        url = reverse('admin:app_post_change', args=[obj.post.id])
        return format_html('<a href="{}" style="color:#38bdf8;font-weight:500;">{}</a>', url, obj.post.title[:30])

    @admin.display(description='Sharh matni')
    def short_text(self, obj):
        return obj.text[:60] + '...' if len(obj.text) > 60 else obj.text


@admin.register(StoryList)
class StoryListAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'is_private_badge', 'post_count_display', 'created')
    list_filter = ('is_private', 'created')
    search_fields = ('name', 'user__username', 'description')
    filter_horizontal = ('posts',)
    ordering = ('-created',)

    @admin.display(description='Ko\'rinish')
    def is_private_badge(self, obj):
        if obj.is_private:
            return mark_safe('<span style="color:#f59e0b;"><i class="fas fa-lock"></i> Maxfiy</span>')
        return mark_safe('<span style="color:#10b981;"><i class="fas fa-globe"></i> Ommaviy</span>')

    @admin.display(description='Maqolalar soni')
    def post_count_display(self, obj):
        return obj.posts.count()


@admin.register(Clap)
class ClapAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'count', 'created')
    list_filter = ('created',)
    search_fields = ('user__username', 'post__title')
    ordering = ('-created',)


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'created')
    list_filter = ('created',)
    search_fields = ('user__username', 'post__title')
    ordering = ('-created',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('actor', 'verb', 'recipient', 'target_post', 'is_read_badge', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('actor__username', 'recipient__username', 'verb')
    ordering = ('-created_at',)
    actions = ['mark_as_read', 'mark_as_unread']

    @admin.display(description='Holati')
    def is_read_badge(self, obj):
        if obj.is_read:
            return mark_safe('<span style="color:#22c55e;"><i class="fas fa-envelope-open"></i> O\'qilgan</span>')
        return mark_safe('<span style="color:#38bdf8;font-weight:bold;"><i class="fas fa-envelope"></i> Yangi</span>')

    @admin.action(description='O\'qilgan deb belgilash')
    def mark_as_read(self, request, queryset):
        queryset.update(is_read=True)

    @admin.action(description='O\'qilmagan deb belgilash')
    def mark_as_unread(self, request, queryset):
        queryset.update(is_read=False)
