from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import User
from app.models import StoryList


class StoryListInline(admin.TabularInline):
    model = StoryList
    extra = 0
    fields = ('name', 'is_private', 'created')
    readonly_fields = ('created',)
    show_change_link = True


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = (
        'avatar_preview',
        'username',
        'email',
        'full_name_display',
        'membership_badge',
        'follower_count_display',
        'is_active_badge',
        'is_staff'
    )
    list_display_links = ('avatar_preview', 'username')
    list_filter = ('membership_tier', 'is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    inlines = [StoryListInline]
    filter_horizontal = ('following', 'groups', 'user_permissions')

    fieldsets = (
        ('Asosiy Ma\'lumotlar', {
            'fields': ('username', 'password', 'avatar_preview_large', 'avatar')
        }),
        ('Shaxsiy Ma\'lumotlar', {
            'fields': ('first_name', 'last_name', 'email', 'bio')
        }),
        ('Medium Sozlamalari', {
            'fields': (
                'membership_tier',
                'license',
                'following',
                'email_digest',
                'social_activity_notifications'
            )
        }),
        ('Ruxsatlar va Huquqlar', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')
        }),
        ('Muhim Sanalar', {
            'fields': ('last_login', 'date_joined')
        }),
    )
    readonly_fields = ('avatar_preview_large', 'date_joined', 'last_login')

    actions = ['activate_users', 'deactivate_users', 'grant_member_plus']

    @admin.display(description='Avatar')
    def avatar_preview(self, obj):
        url = obj.get_avatar_url()
        if url:
            return format_html(
                '<img src="{}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid #4ade80;" />',
                url
            )
        initial = (obj.username[0] if obj.username else 'U').upper()
        return format_html(
            '<div style="width:34px;height:34px;border-radius:50%;background:#1e293b;color:#10b981;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:13px;border:1px solid #334155;">{}</div>',
            initial
        )

    @admin.display(description='Avatar Rasmi')
    def avatar_preview_large(self, obj):
        url = obj.get_avatar_url()
        if url:
            return format_html(
                '<img src="{}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:2px solid #10b981;box-shadow:0 4px 12px rgba(0,0,0,0.2);" />',
                url
            )
        return "Avatar yuklanmagan"

    @admin.display(description='To\'liq Ism')
    def full_name_display(self, obj):
        return obj.get_display_name()

    @admin.display(description='A\'zolik')
    def membership_badge(self, obj):
        tier = obj.membership_tier or 'Free Member'
        color = '#10b981' if 'plus' in tier.lower() or 'premium' in tier.lower() else '#64748b'
        return format_html(
            '<span style="background:{};color:#ffffff;padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;">{}</span>',
            color,
            tier
        )

    @admin.display(description='Obunachilar')
    def follower_count_display(self, obj):
        return obj.follower_count

    @admin.display(description='Holati')
    def is_active_badge(self, obj):
        if obj.is_active:
            return mark_safe('<span style="color:#22c55e;font-weight:600;"><i class="fas fa-check-circle"></i> Faol</span>')
        return mark_safe('<span style="color:#ef4444;font-weight:600;"><i class="fas fa-times-circle"></i> Bloklangan</span>')

    @admin.action(description='Tanlangan foydalanuvchilarni faollashtirish')
    def activate_users(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} ta foydalanuvchi faollashtirildi.")

    @admin.action(description='Tanlangan foydalanuvchilarni bloklash')
    def deactivate_users(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} ta foydalanuvchi bloklandi.")

    @admin.action(description='Member+ darajasiga ko\'tarish')
    def grant_member_plus(self, request, queryset):
        updated = queryset.update(membership_tier='Member+')
        self.message_user(request, f"{updated} ta foydalanuvchi Member+ ga o'tkazildi.")
