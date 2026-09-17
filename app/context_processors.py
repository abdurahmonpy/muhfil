from django.db.models import Count
from django.conf import settings
from app.models import Tag, Notification


def global_context(request):
    ctx = {
        'recent_notifications': [],
        'unread_notifications_count': 0,
        'trending_tags': [],
        'sidebar_following': [],
        'GOOGLE_CLIENT_ID': getattr(settings, 'GOOGLE_CLIENT_ID', ''),
    }

    try:
        ctx['trending_tags'] = Tag.objects.annotate(
            post_count=Count('posts')
        ).order_by('-post_count')[:7]
    except Exception:
        pass

    if request.user.is_authenticated:
        try:
            user_notifs = Notification.objects.filter(
                recipient=request.user
            ).select_related('actor', 'target_post')
            ctx['recent_notifications'] = list(user_notifs[:5])
            ctx['unread_notifications_count'] = user_notifs.filter(is_read=False).count()
            ctx['sidebar_following'] = list(request.user.following.all()[:5])
        except Exception:
            pass

    return ctx
