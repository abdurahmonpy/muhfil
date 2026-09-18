import json
import re
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.db.models import Q, F, Count, Sum
from django.contrib.auth import get_user_model
from django.utils.text import slugify

from .models import Post, Tag, Clap, Comment, Bookmark, StoryList, Notification
from conf.security import sanitize_html, sanitize_plain_text

User = get_user_model()


def index(request):
    if request.user.is_authenticated:
        return redirect('feed')

    trending_posts = Post.objects.filter(
        status='published'
    ).select_related('author').prefetch_related('tags', 'claps')[:6]

    posts = Post.objects.filter(
        status='published'
    ).select_related('author').prefetch_related('tags', 'claps', 'comments').order_by('-created')[:15]

    popular_tags = Tag.objects.annotate(
        post_count=Count('posts', filter=Q(posts__status='published'))
    ).filter(post_count__gt=0).order_by('-post_count')[:8]

    ctx = {
        'trending_posts': trending_posts,
        'posts': posts,
        'popular_tags': popular_tags,
    }
    return render(request, 'index.html', ctx)


def feed(request):
    # Published posts for "For you"
    posts = Post.objects.filter(
        status='published'
    ).select_related('author').prefetch_related('tags', 'claps', 'comments').order_by('-created')

    bookmarked_ids = set()
    liked_post_ids = set()
    activity_posts = []
    following_ids = []

    if request.user.is_authenticated:
        bookmarked_ids = set(request.user.bookmarks.values_list('post_id', flat=True))
        liked_post_ids = set(request.user.claps.filter(count__gt=0).values_list('post_id', flat=True))
        following_users = request.user.following.all()
        following_ids = list(following_users.values_list('id', flat=True))
        if following_users.exists():
            activity_posts = Post.objects.filter(
                status='published',
                author__in=following_users
            ).select_related('author').prefetch_related('tags', 'claps', 'comments').order_by('-created')[:20]

    # Who to follow sidebar recommendations
    exclude_ids = [request.user.id] + following_ids if request.user.is_authenticated else []
    who_to_follow = User.objects.exclude(
        id__in=exclude_ids
    ).annotate(
        story_count=Count('posts')
    ).order_by('-story_count')[:5]

    # Recommended topics for right sidebar
    recommended_topics = Tag.objects.annotate(
        post_count=Count('posts')
    ).order_by('-post_count')[:7]

    ctx = {
        'posts': posts,
        'activity_posts': activity_posts,
        'bookmarked_ids': bookmarked_ids,
        'liked_post_ids': liked_post_ids,
        'who_to_follow': who_to_follow,
        'recommended_topics': recommended_topics,
    }
    return render(request, 'feed.html', ctx)


def story(request, slug=None):
    if slug:
        post = Post.objects.select_related('author').prefetch_related('tags').filter(
            slug=slug,
            status='published'
        ).first()

        if not post:
            try:
                import uuid
                post_uuid = uuid.UUID(slug)
                post = Post.objects.select_related('author').prefetch_related('tags').filter(
                    id=post_uuid,
                    status='published'
                ).first()
            except (ValueError, AttributeError):
                pass

        if not post and request.user.is_authenticated:
            post = Post.objects.select_related('author').prefetch_related('tags').filter(
                slug=slug,
                author=request.user
            ).first()

        if not post:
            from django.http import Http404
            raise Http404("Story not found")
    else:
        # Fallback to the latest published story if no slug is given
        post = Post.objects.filter(
            status='published'
        ).select_related('author').prefetch_related('tags').first()
        if not post:
            return redirect('feed')

    # Atomic increment of views count
    Post.objects.filter(pk=post.pk).update(views_count=F('views_count') + 1)
    post.refresh_from_db(fields=['views_count'])

    comments = post.comments.filter(
        parent=None
    ).select_related('user').prefetch_related('replies__user').order_by('-created')

    total_claps = post.total_claps()
    user_claps = 0
    is_liked = False
    is_bookmarked = False
    is_following_author = False

    if request.user.is_authenticated:
        clap_obj = post.claps.filter(user=request.user).first()
        if clap_obj and clap_obj.count > 0:
            is_liked = True
            user_claps = 1
        is_bookmarked = post.bookmarks.filter(user=request.user).exists()
        is_following_author = request.user.following.filter(id=post.author.id).exists()

    related_posts = Post.objects.filter(
        status='published',
        tags__in=post.tags.all()
    ).exclude(id=post.id).distinct()[:3]

    ctx = {
        'post': post,
        'comments': comments,
        'total_claps': total_claps,
        'user_claps': user_claps,
        'is_liked': is_liked,
        'is_bookmarked': is_bookmarked,
        'is_following_author': is_following_author,
        'related_posts': related_posts,
    }
    return render(request, 'story.html', ctx)


def story_detail(request, slug):
    return story(request, slug=slug)


@login_required
def write(request):
    edit_slug = request.GET.get('edit')
    edit_post = None
    if edit_slug:
        edit_post = Post.objects.filter(slug=edit_slug, author=request.user).first()
        if not edit_post:
            try:
                import uuid
                edit_post = Post.objects.filter(id=uuid.UUID(edit_slug), author=request.user).first()
            except (ValueError, AttributeError):
                pass
    return render(request, 'write.html', {'edit_post': edit_post})


@require_POST
def create_post_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    title = ''
    subtitle = ''
    text = ''
    plain_text = ''
    topics_raw = []
    status = 'published'

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({'success': False, 'error': 'Invalid JSON format'}, status=400)
        title = data.get('title', '').strip()
        subtitle = data.get('subtitle', '').strip()
        text = data.get('text', '') or data.get('content', '')
        plain_text = data.get('plain_text', '').strip()
        topics_raw = data.get('topics', [])
        status = data.get('status', 'published')
        cover_url = data.get('cover_url', '').strip()
        post_id = data.get('post_id')
    else:
        title = request.POST.get('title', '').strip()
        subtitle = request.POST.get('subtitle', '').strip()
        text = request.POST.get('text', '') or request.POST.get('content', '')
        plain_text = request.POST.get('plain_text', '').strip()
        topics_input = request.POST.get('topics', '')
        topics_raw = [t.strip() for t in topics_input.split(',') if t.strip()]
        status = request.POST.get('status', 'published')
        cover_url = request.POST.get('cover_url', '').strip()
        post_id = request.POST.get('post_id')

    if not title:
        return JsonResponse({'success': False, 'error': 'Story title is required'}, status=400)

    if not text and not plain_text:
        return JsonResponse({'success': False, 'error': 'Story content cannot be empty'}, status=400)

    # Sanitize inputs against Stored XSS attacks
    clean_title = sanitize_plain_text(title)
    clean_subtitle = sanitize_plain_text(subtitle)
    clean_text = sanitize_html(text)
    clean_plain_text = sanitize_plain_text(plain_text)

    # Auto-detect first image as cover_url if not provided
    if not cover_url and '<img ' in clean_text:
        img_match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', clean_text)
        if img_match:
            cover_url = img_match.group(1)

    # If updating an existing post
    if post_id:
        post = get_object_or_404(Post, pk=post_id, author=request.user)
        post.title = clean_title
        post.subtitle = clean_subtitle
        post.text = clean_text
        post.plain_text = clean_plain_text
        post.status = status
        if cover_url:
            post.cover_url = cover_url
        post.save()
    else:
        # Create new post
        post = Post.objects.create(
            author=request.user,
            title=clean_title,
            subtitle=clean_subtitle,
            text=clean_text,
            plain_text=clean_plain_text,
            status=status,
            cover_url=cover_url
        )

    # Handle cover image if uploaded
    if 'cover_image' in request.FILES:
        post.cover_image = request.FILES['cover_image']
        post.save(update_fields=['cover_image'])

    # Handle topic tags
    if isinstance(topics_raw, str):
        topics_raw = [t.strip() for t in topics_raw.split(',') if t.strip()]

    if topics_raw:
        post.tags.clear()
        for topic_name in topics_raw[:5]:
            topic_name = topic_name.strip()
            if topic_name:
                tag, _ = Tag.objects.get_or_create(
                    name=topic_name.title(),
                    defaults={'slug': slugify(topic_name)}
                )
                post.tags.add(tag)

    return JsonResponse({
        'success': True,
        'post_id': str(post.id),
        'slug': post.slug,
        'redirect_url': f'/story/{post.slug}/'
    })


@require_POST
def delete_post_api(request, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Tizimga kirish talab qilinadi'}, status=401)

    post = get_object_or_404(Post, pk=post_id)
    if post.author != request.user and not request.user.is_staff:
        return JsonResponse({'success': False, 'error': 'Ruxsat berilmadi'}, status=403)

    post.delete()
    return JsonResponse({'success': True, 'redirect_url': '/feed/'})


@require_POST
def toggle_clap_api(request, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Tizimga kirish talab qilinadi', 'login_required': True}, status=401)

    post = get_object_or_404(Post, pk=post_id)
    clap = Clap.objects.filter(post=post, user=request.user).first()

    if clap and clap.count > 0:
        # Foydalanuvchi allaqachon like bosgan -> Like olib tashlanadi (Unlike)
        clap.delete()
        liked = False
    else:
        # Faqat 1 ta like bosiladi (Strictly 1 like)
        if not clap:
            clap = Clap(post=post, user=request.user)
        clap.count = 1
        clap.save()
        liked = True

        # Muallif o'zi bo'lmasa, bildirishnoma yuborish
        if post.author != request.user:
            Notification.objects.create(
                recipient=post.author,
                actor=request.user,
                verb=f'hikoyangizga like bosdi: "{post.title[:30]}"',
                target_post=post
            )

    total_claps = post.total_claps()

    return JsonResponse({
        'success': True,
        'liked': liked,
        'total_claps': total_claps,
        'user_claps': 1 if liked else 0
    })


@require_POST
def add_comment_api(request, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    post = get_object_or_404(Post, pk=post_id)
    text = ''
    parent_id = None

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
            text = data.get('text', '').strip()
            parent_id = data.get('parent_id')
        except Exception:
            return JsonResponse({'success': False, 'error': 'Invalid JSON format'}, status=400)
    else:
        text = request.POST.get('text', '').strip()
        parent_id = request.POST.get('parent_id')

    if not text:
        return JsonResponse({'success': False, 'error': 'Comment text cannot be empty'}, status=400)

    parent = None
    if parent_id:
        parent = Comment.objects.filter(pk=parent_id, post=post).first()

    clean_comment_text = sanitize_plain_text(text)

    comment = Comment.objects.create(
        post=post,
        user=request.user,
        text=clean_comment_text,
        parent=parent
    )

    # Notify author
    if post.author != request.user:
        Notification.objects.create(
            recipient=post.author,
            actor=request.user,
            verb=f'responded to your story "{post.title[:30]}"',
            target_post=post
        )

    return JsonResponse({
        'success': True,
        'comment': {
            'id': comment.id,
            'author_name': request.user.get_display_name(),
            'author_avatar': request.user.get_avatar_url(),
            'author_initial': request.user.username[0].upper() if request.user.username else 'A',
            'text': comment.text,
            'created': 'Just now',
            'claps_count': 0
        },
        'comments_count': post.comments_count()
    })


@require_POST
def toggle_bookmark_api(request, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    post = get_object_or_404(Post, pk=post_id)
    bookmark = Bookmark.objects.filter(user=request.user, post=post).first()

    # Get or create user's Reading List
    reading_list, _ = StoryList.objects.get_or_create(
        user=request.user,
        name="Reading list",
        defaults={'description': 'Default private reading list', 'is_private': True}
    )

    if bookmark:
        bookmark.delete()
        reading_list.posts.remove(post)
        is_bookmarked = False
    else:
        Bookmark.objects.create(user=request.user, post=post)
        reading_list.posts.add(post)
        is_bookmarked = True

    return JsonResponse({
        'success': True,
        'is_bookmarked': is_bookmarked
    })


def lists(request):
    if not request.user.is_authenticated:
        return redirect('index')

    user_lists = request.user.story_lists.annotate(
        post_count=Count('posts')
    ).prefetch_related('posts__author').order_by('-created')

    active_list_id = request.GET.get('list')
    active_list = None
    list_posts = []
    if active_list_id:
        active_list = request.user.story_lists.filter(pk=active_list_id).first()
        if active_list:
            list_posts = active_list.posts.select_related('author').prefetch_related('tags', 'claps', 'comments').order_by('-created')

    saved_posts = Post.objects.filter(
        bookmarks__user=request.user
    ).select_related('author').prefetch_related('tags', 'claps', 'comments').order_by('-bookmarks__created')

    liked_post_ids = set(request.user.claps.filter(count__gt=0).values_list('post_id', flat=True))
    bookmarked_ids = set(request.user.bookmarks.values_list('post_id', flat=True))

    ctx = {
        'user_lists': user_lists,
        'saved_posts': saved_posts,
        'active_list': active_list,
        'list_posts': list_posts,
        'liked_post_ids': liked_post_ids,
        'bookmarked_ids': bookmarked_ids,
    }
    return render(request, 'lists.html', ctx)


@require_POST
def create_list_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    name = ''
    description = ''
    is_private = False

    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
            name = data.get('name', '').strip()
            description = data.get('description', '').strip()
            is_private = bool(data.get('is_private', False))
        except Exception:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
    else:
        name = request.POST.get('name', '').strip()
        description = request.POST.get('description', '').strip()
        is_private = request.POST.get('is_private') in ['true', 'on', '1']

    if not name:
        return JsonResponse({'success': False, 'error': 'List name is required'}, status=400)

    clean_name = sanitize_plain_text(name)
    clean_desc = sanitize_plain_text(description)

    story_list = StoryList.objects.create(
        user=request.user,
        name=clean_name,
        description=clean_desc,
        is_private=is_private
    )

    return JsonResponse({
        'success': True,
        'list': {
            'id': story_list.id,
            'name': story_list.name,
            'description': story_list.description,
            'is_private': story_list.is_private,
            'post_count': 0
        }
    })


@require_POST
def add_to_list_api(request, list_id, post_id):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    story_list = get_object_or_404(StoryList, pk=list_id, user=request.user)
    post = get_object_or_404(Post, pk=post_id)

    if story_list.posts.filter(pk=post.pk).exists():
        story_list.posts.remove(post)
        in_list = False
    else:
        story_list.posts.add(post)
        in_list = True

    return JsonResponse({
        'success': True,
        'in_list': in_list,
        'post_count': story_list.posts.count()
    })


def profile(request, username=None):
    if username:
        profile_user = get_object_or_404(User, username=username)
    elif request.user.is_authenticated:
        profile_user = request.user
    else:
        return redirect('index')

    is_own_profile = (request.user == profile_user)

    published_posts = profile_user.posts.filter(
        status='published'
    ).prefetch_related('tags', 'claps', 'comments').order_by('-created')

    draft_posts = []
    if is_own_profile:
        draft_posts = profile_user.posts.filter(
            status='draft'
        ).prefetch_related('tags').order_by('-created')

    is_following = (
        request.user.is_authenticated and
        request.user.following.filter(pk=profile_user.pk).exists()
    )

    public_lists = profile_user.story_lists.filter(
        is_private=False
    ).annotate(post_count=Count('posts'))

    ctx = {
        'profile_user': profile_user,
        'published_posts': published_posts,
        'draft_posts': draft_posts,
        'is_own_profile': is_own_profile,
        'is_following': is_following,
        'public_lists': public_lists,
    }
    return render(request, 'profile.html', ctx)


def search(request):
    query = request.GET.get('q', '').strip()
    topic_filter = request.GET.get('topic', '').strip()

    posts = Post.objects.filter(status='published').select_related('author').prefetch_related('tags', 'claps')
    people = User.objects.none()
    topics = Tag.objects.none()

    if topic_filter:
        posts = posts.filter(tags__name__iexact=topic_filter)
    elif query:
        posts = posts.filter(
            Q(title__icontains=query) |
            Q(subtitle__icontains=query) |
            Q(plain_text__icontains=query) |
            Q(tags__name__icontains=query) |
            Q(author__username__icontains=query) |
            Q(author__first_name__icontains=query) |
            Q(author__last_name__icontains=query)
        ).distinct()

        people = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(bio__icontains=query)
        ).distinct()[:10]

        topics = Tag.objects.filter(
            Q(name__icontains=query) |
            Q(slug__icontains=query)
        )[:10]

    ctx = {
        'query': query,
        'topic_filter': topic_filter,
        'posts': posts[:30],
        'people': people,
        'topics': topics,
    }
    return render(request, 'search.html', ctx)


@login_required
def stats(request):
    user_posts = request.user.posts.filter(status='published').annotate(
        claps_sum=Sum('claps__count')
    ).order_by('-views_count')

    total_views = sum(p.views_count for p in user_posts)
    total_reads = sum(p.reads_count for p in user_posts)
    fans_count = Clap.objects.filter(post__author=request.user).values('user').distinct().count()

    ctx = {
        'posts': user_posts,
        'total_views': total_views,
        'total_reads': total_reads,
        'fans_count': fans_count,
    }
    return render(request, 'stats.html', ctx)


@login_required
def notifications(request):
    user_notifications = request.user.notifications.select_related(
        'actor', 'target_post'
    ).order_by('-created_at')

    # Mark as read
    request.user.notifications.filter(is_read=False).update(is_read=True)

    ctx = {
        'notifications': user_notifications,
    }
    return render(request, 'notifications.html', ctx)


@require_POST
def mark_notifications_read_api(request):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)

    request.user.notifications.filter(is_read=False).update(is_read=True)
    return JsonResponse({'success': True})


@login_required
def settings(request):
    return render(request, 'settings.html', {'user': request.user})


def about(request):
    return render(request, 'about.html')




















