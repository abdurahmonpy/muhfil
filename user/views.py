import json
import re
import urllib.request
import urllib.parse
from django.conf import settings
from django.urls import reverse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login as auth_login, logout as auth_logout, authenticate, update_session_auth_hash
from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.utils.text import slugify

from .models import User
from app.models import Notification, StoryList
from conf.security import auth_rate_limiter, timing_safe_fake_check, sanitize_plain_text


def register_view(request):
    if request.user.is_authenticated:
        return redirect('index')

    if request.method == 'POST':
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
            except Exception:
                return JsonResponse({'success': False, 'error': 'Noto\'g\'ri JSON formati'}, status=400)
            full_name = data.get('full_name', '').strip()
            email = data.get('email', '').strip().lower()
            password = data.get('password', '')
            remember = data.get('remember', True)
        else:
            full_name = request.POST.get('full_name', '').strip()
            email = request.POST.get('email', '').strip().lower()
            password = request.POST.get('password', '')
            remember = request.POST.get('remember', True)

        # Rate limiter tekshiruvi (Brute-force va avtomatik bot hujumlaridan himoya)
        if auth_rate_limiter.is_rate_limited(request, email):
            msg = 'Juda ko\'p urinishlar qilindi. Xavfsizlik yuzasidan 5 daqiqadan so\'ng qayta urinib ko\'ring.'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=429)
            return render(request, 'register.html', {'error': msg}, status=429)

        if not email or not password:
            auth_rate_limiter.record_failure(request, email)
            msg = 'Elektron pochta va parol kiritilishi shart'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=400)
            return render(request, 'register.html', {'error': msg})

        # Kuchli parol tekshiruvi (Cybersecurity Password Strength Validation)
        try:
            validate_password(password)
        except ValidationError as e:
            auth_rate_limiter.record_failure(request, email)
            err_text = " ".join(e.messages)
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': err_text}, status=400)
            return render(request, 'register.html', {'error': err_text})

        if User.objects.filter(email__iexact=email).exists():
            auth_rate_limiter.record_failure(request, email)
            msg = 'Ushbu elektron pochta orqali allaqachon ro\'yxatdan o\'tilgan'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=400)
            return render(request, 'register.html', {'error': msg})

        # Generate unique username
        base_username = slugify(email.split('@')[0]) or 'reader'
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        clean_full_name = sanitize_plain_text(full_name)
        first_name = clean_full_name
        last_name = ''
        if ' ' in clean_full_name:
            parts = clean_full_name.split(' ', 1)
            first_name, last_name = parts[0], parts[1]

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name
        )

        # Create default Reading List
        StoryList.objects.create(
            user=user,
            name="Reading list",
            description="Default private reading list",
            is_private=True
        )

        auth_rate_limiter.reset_attempts(request, email)
        auth_login(request, user)
        if not remember:
            request.session.set_expiry(0)

        if request.content_type == 'application/json':
            return JsonResponse({'success': True, 'redirect_url': '/'})
        return redirect('index')

    return render(request, 'register.html')


def login_view(request):
    if request.user.is_authenticated:
        return redirect('index')

    if request.method == 'POST':
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
            except Exception:
                return JsonResponse({'success': False, 'error': 'Noto\'g\'ri JSON formati'}, status=400)
            identifier = data.get('identifier', '') or data.get('email', '') or data.get('username', '')
            password = data.get('password', '')
            remember = data.get('remember', True)
        else:
            identifier = request.POST.get('identifier', '') or request.POST.get('email', '') or request.POST.get('username', '')
            password = request.POST.get('password', '')
            remember = request.POST.get('remember', True)

        identifier = identifier.strip()

        # Brute-force va Credential Stuffing tekshiruvi
        if auth_rate_limiter.is_rate_limited(request, identifier):
            msg = 'Juda ko\'p xato urinishlar qayd etildi. Xavfsizlik yuzasidan 5 daqiqadan so\'ng qayta urinib ko\'ring.'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=429)
            return render(request, 'login.html', {'error': msg}, status=429)

        user = None

        # Try authenticating directly by username
        user = authenticate(request, username=identifier, password=password)
        if not user:
            # Try finding user by email
            try:
                user_obj = User.objects.get(email__iexact=identifier)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                # Timing attack mitigatsiyasi: soxta tekshirish orqali vaqt tenglanadi
                timing_safe_fake_check()
                user = None

        if user is not None:
            if not user.is_active:
                auth_rate_limiter.record_failure(request, identifier)
                msg = 'Ushbu hisob bloklangan.'
                if request.content_type == 'application/json':
                    return JsonResponse({'success': False, 'error': msg}, status=403)
                return render(request, 'login.html', {'error': msg}, status=403)

            # Muvaffaqiyatli kirish: urinishlar hisoblagichini tozalash
            auth_rate_limiter.reset_attempts(request, identifier)
            auth_login(request, user)
            if not remember:
                request.session.set_expiry(0)

            if request.content_type == 'application/json':
                return JsonResponse({'success': True, 'redirect_url': '/'})
            return redirect('index')
        else:
            auth_rate_limiter.record_failure(request, identifier)
            msg = 'Noto\'g\'ri email/foydalanuvchi nomi yoki parol.'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=400)
            return render(request, 'login.html', {'error': msg})

    return render(request, 'login.html')


def logout_view(request):
    auth_logout(request)
    return redirect('index')


@require_POST
def toggle_follow_view(request, user_id=None):
    if not request.user.is_authenticated:
        return JsonResponse({'success': False, 'error': 'Tizimga kirish talab qilinadi', 'login_required': True}, status=401)

    if user_id:
        target_user = get_object_or_404(User, pk=user_id)
    else:
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
                target_id = data.get('user_id')
            except Exception:
                target_id = None
        else:
            target_id = request.POST.get('user_id')

        if not target_id:
            return JsonResponse({'success': False, 'error': 'Foydalanuvchi ID talab qilinadi'}, status=400)
        target_user = get_object_or_404(User, pk=target_id)

    if target_user == request.user:
        return JsonResponse({'success': False, 'error': 'O\'zingizni kuzata olmaysiz'}, status=400)

    if request.user.following.filter(pk=target_user.pk).exists():
        request.user.following.remove(target_user)
        is_following = False
    else:
        request.user.following.add(target_user)
        is_following = True

        Notification.objects.create(
            recipient=target_user,
            actor=request.user,
            verb='sizni kuzatishni boshladi'
        )

    return JsonResponse({
        'success': True,
        'user_id': target_user.id,
        'is_following': is_following,
        'follower_count': target_user.follower_count
    })


@login_required
def settings_view(request):
    return render(request, 'settings.html', {'user': request.user})


@login_required
@require_POST
def settings_update_view(request):
    user = request.user
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({'success': False, 'error': 'Invalid JSON'}, status=400)
        if 'name' in data:
            full_name = sanitize_plain_text(data['name'])
            if ' ' in full_name:
                parts = full_name.split(' ', 1)
                user.first_name, user.last_name = parts[0], parts[1]
            else:
                user.first_name = full_name
                user.last_name = ''
        if 'bio' in data:
            user.bio = sanitize_plain_text(data['bio'])
        if 'email_digest' in data:
            user.email_digest = bool(data['email_digest'])
        if 'social_activity_notifications' in data:
            user.social_activity_notifications = bool(data['social_activity_notifications'])
        if 'license' in data:
            user.license = sanitize_plain_text(data['license'])
        user.save()
        return JsonResponse({'success': True, 'message': 'Settings updated successfully'})

    # Form post (including avatar upload)
    full_name = sanitize_plain_text(request.POST.get('name', ''))
    if full_name:
        if ' ' in full_name:
            parts = full_name.split(' ', 1)
            user.first_name, user.last_name = parts[0], parts[1]
        else:
            user.first_name = full_name
            user.last_name = ''
    bio = request.POST.get('bio', None)
    if bio is not None:
        user.bio = sanitize_plain_text(bio)
    if 'avatar' in request.FILES:
        user.avatar = request.FILES['avatar']
    license_choice = request.POST.get('license', None)
    if license_choice:
        user.license = sanitize_plain_text(license_choice)

    user.save()
    return redirect('settings')


update_settings_view = settings_update_view


@login_required
@require_POST
def change_password_view(request):
    user = request.user
    if request.content_type == 'application/json':
        try:
            data = json.loads(request.body)
        except Exception:
            return JsonResponse({'success': False, 'error': 'Invalid JSON format'}, status=400)
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        confirm_password = data.get('confirm_password', '')
    else:
        current_password = request.POST.get('current_password', '')
        new_password = request.POST.get('new_password', '')
        confirm_password = request.POST.get('confirm_password', '')

    if not current_password or not new_password:
        return JsonResponse({'success': False, 'error': 'Current and new password are required.'}, status=400)

    if not user.check_password(current_password):
        return JsonResponse({'success': False, 'error': 'Current password is incorrect.'}, status=400)

    if new_password != confirm_password:
        return JsonResponse({'success': False, 'error': 'New passwords do not match.'}, status=400)

    try:
        validate_password(new_password, user)
    except ValidationError as e:
        return JsonResponse({'success': False, 'error': ' '.join(e.messages)}, status=400)

    user.set_password(new_password)
    user.save()
    update_session_auth_hash(request, user)
    return JsonResponse({'success': True, 'message': 'Password updated successfully!'})


def save_google_avatar(user, picture_url):
    """Foydalanuvchining Google hisobidagi profil rasmini yuklab olib profiliga saqlash."""
    if not user or not picture_url:
        return

    should_download = False
    if not user.avatar:
        should_download = True
    else:
        try:
            if not user.avatar.storage.exists(user.avatar.name):
                should_download = True
            elif '_google.' in user.avatar.name:
                should_download = True
        except Exception:
            should_download = True

    if not should_download:
        return

    # Sifatliroq (256x256) rasm hajmini olish (Google avatar URL lari uchun)
    high_res_url = re.sub(r'=s\d+(-c)?$', '=s256-c', picture_url)

    try:
        req = urllib.request.Request(
            high_res_url,
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status == 200:
                content_type = resp.headers.get('Content-Type', '')
                ext = 'jpg'
                if 'png' in content_type:
                    ext = 'png'
                elif 'webp' in content_type:
                    ext = 'webp'

                img_data = resp.read()
                if img_data:
                    # Agar avvalgi Google avatar fayli mavjud bo'lsa uni o'chiramiz
                    if user.avatar and user.avatar.name:
                        try:
                            if user.avatar.storage.exists(user.avatar.name):
                                user.avatar.storage.delete(user.avatar.name)
                        except Exception:
                            pass
                    file_name = f"{user.username}_google.{ext}"
                    user.avatar.save(file_name, ContentFile(img_data), save=True)
    except Exception:
        # Google avatar yuklanmasa ham autentifikatsiya muvaffaqiyatli davom etishi kerak
        pass


def google_auth_view(request):
    if request.user.is_authenticated:
        return redirect('index')

    # Agar foydalanuvchi to'g'ridan-to'g'ri rasmiy Google oynasiga yo'naltirilishi so'ralsa
    if request.method == 'GET' and (request.GET.get('redirect') == '1' or request.GET.get('action') == 'oauth'):
        redirect_uri = request.build_absolute_uri(reverse('google_auth_callback'))
        scope = "openid email profile"
        google_oauth_url = (
            "https://accounts.google.com/o/oauth2/v2/auth?"
            f"client_id={settings.GOOGLE_CLIENT_ID}&"
            f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
            "response_type=code&"
            f"scope={urllib.parse.quote(scope)}&"
            "access_type=offline&"
            "prompt=select_account"
        )
        return redirect(google_oauth_url)

    if request.method == 'POST':
        picture = ''
        if request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
                email = data.get('email', '').strip().lower()
                name = data.get('name', '').strip()
                credential = data.get('credential', '').strip()
                picture = data.get('picture', '').strip()
            except Exception:
                return JsonResponse({'success': False, 'error': 'Noto\'g\'ri JSON formati'}, status=400)
        else:
            email = request.POST.get('email', '').strip().lower()
            name = request.POST.get('name', '').strip()
            credential = request.POST.get('credential', '').strip()
            picture = request.POST.get('picture', '').strip()

        # Agar Google One Tap / GSI token yuborilgan bo'lsa
        if credential:
            try:
                verify_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}"
                req = urllib.request.Request(verify_url, headers={'User-Agent': 'Muhfil/1.0'})
                with urllib.request.urlopen(req, timeout=8) as response:
                    id_info = json.loads(response.read().decode('utf-8'))

                if id_info.get('aud') != settings.GOOGLE_CLIENT_ID:
                    return JsonResponse({'success': False, 'error': 'Google token auditoriyasi mos kelmadi'}, status=401)

                email = id_info.get('email', '').strip().lower()
                name = id_info.get('name', '').strip()
                if id_info.get('picture'):
                    picture = id_info.get('picture', '').strip()
            except Exception as e:
                return JsonResponse({'success': False, 'error': f'Google token tasdiqlanmadi: {str(e)}'}, status=400)

        # Rate limit tekshiruvi
        if auth_rate_limiter.is_rate_limited(request, email):
            msg = 'Juda ko\'p urinishlar qilindi. Iltimos, 5 daqiqadan so\'ng qayta urinib ko\'ring.'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=429)
            return render(request, 'google_auth.html', {'error': msg}, status=429)

        if not email:
            auth_rate_limiter.record_failure(request, email)
            msg = 'Gmail yoki elektron pochta manzili talab qilinadi.'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=400)
            return render(request, 'google_auth.html', {'error': msg})

        # Agar foydalanuvchi faqat username kiritgan bo'lsa, @gmail.com qo'shiladi
        if '@' not in email:
            email = f"{email}@gmail.com"

        clean_name = sanitize_plain_text(name)
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            base_username = slugify(email.split('@')[0]) or 'user'
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            first_name = clean_name or email.split('@')[0].replace('.', ' ').capitalize()
            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name
            )
            user.set_unusable_password()
            user.save()

            StoryList.objects.get_or_create(
                user=user,
                name="Reading list",
                defaults={'description': 'Default private reading list', 'is_private': True}
            )
        elif not user.first_name and clean_name:
            user.first_name = clean_name
            user.save(update_fields=['first_name'])

        if picture:
            save_google_avatar(user, picture)

        if not user.is_active:
            auth_rate_limiter.record_failure(request, email)
            msg = 'Ushbu hisob bloklangan.'
            if request.content_type == 'application/json':
                return JsonResponse({'success': False, 'error': msg}, status=403)
            return redirect(f'/login/?error={urllib.parse.quote(msg)}')

        auth_rate_limiter.reset_attempts(request, email)
        auth_login(request, user)

        if request.content_type == 'application/json':
            return JsonResponse({'success': True, 'redirect_url': '/'})
        return redirect('index')

    # GET so'rovda to'g'ridan-to'g'ri rasmiy Google OAuth sahifasiga yo'naltiriladi
    if not getattr(settings, 'GOOGLE_CLIENT_ID', None):
        return redirect('/login/?error=' + urllib.parse.quote('Google OAuth sozlanmagan. Iltimos, email orqali kiring.'))

    redirect_uri = request.build_absolute_uri(reverse('google_auth_callback'))
    if not request.is_secure() and not request.get_host().startswith(('localhost', '127.0.0.1')):
        if redirect_uri.startswith('http://'):
            redirect_uri = 'https://' + redirect_uri[7:]

    scope = "openid email profile"
    google_oauth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.GOOGLE_CLIENT_ID}&"
        f"redirect_uri={urllib.parse.quote(redirect_uri)}&"
        "response_type=code&"
        f"scope={urllib.parse.quote(scope)}&"
        "access_type=offline&"
        "prompt=select_account"
    )
    return redirect(google_oauth_url)


def google_auth_callback_view(request):
    """Google OAuth 2.0 orqali qaytganda kodni almashtirib foydalanuvchini tizimga kiritish."""
    if request.user.is_authenticated:
        return redirect('index')

    error = request.GET.get('error')
    if error:
        return redirect(f'/login/?error={urllib.parse.quote("Google autentifikatsiyasi bekor qilindi: " + error)}')

    code = request.GET.get('code')
    if not code:
        return redirect('/login/?error=' + urllib.parse.quote('Google avtorizatsiya kodi topilmadi'))

    redirect_uri = request.build_absolute_uri(reverse('google_auth_callback'))
    if not request.is_secure() and not request.get_host().startswith(('localhost', '127.0.0.1')):
        if redirect_uri.startswith('http://'):
            redirect_uri = 'https://' + redirect_uri[7:]

    # Google token endpointiga so'rov yuborish
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        'code': code,
        'client_id': settings.GOOGLE_CLIENT_ID,
        'client_secret': settings.GOOGLE_CLIENT_SECRET,
        'redirect_uri': redirect_uri,
        'grant_type': 'authorization_code',
    }
    try:
        encoded_data = urllib.parse.urlencode(data).encode('utf-8')
        req = urllib.request.Request(
            token_url,
            data=encoded_data,
            headers={'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Muhfil/1.0'}
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            token_resp = json.loads(resp.read().decode('utf-8'))

        access_token = token_resp.get('access_token')
        if not access_token:
            return redirect('/login/?error=' + urllib.parse.quote('Google kirish tokeni olinmadi'))

        # Foydalanuvchi ma'lumotlarini olish
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        user_req = urllib.request.Request(
            userinfo_url,
            headers={'Authorization': f'Bearer {access_token}', 'User-Agent': 'Muhfil/1.0'}
        )
        with urllib.request.urlopen(user_req, timeout=10) as uresp:
            userinfo = json.loads(uresp.read().decode('utf-8'))

        email = userinfo.get('email', '').strip().lower()
        if not email:
            return redirect('/login/?error=' + urllib.parse.quote('Google hisobidan elektron pochta olinmadi'))

        first_name = userinfo.get('given_name') or userinfo.get('name') or email.split('@')[0].capitalize()
        last_name = userinfo.get('family_name') or ''
        picture = userinfo.get('picture', '').strip()

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            base_username = slugify(email.split('@')[0]) or 'user'
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1

            user = User.objects.create_user(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name
            )
            user.set_unusable_password()
            user.save()

            StoryList.objects.get_or_create(
                user=user,
                name="Reading list",
                defaults={'description': 'Default private reading list', 'is_private': True}
            )
        else:
            update_fields = []
            if not user.first_name and first_name:
                user.first_name = first_name
                update_fields.append('first_name')
            if not user.last_name and last_name:
                user.last_name = last_name
                update_fields.append('last_name')
            if update_fields:
                user.save(update_fields=update_fields)

        if picture:
            save_google_avatar(user, picture)

        if not user.is_active:
            return redirect('/login/?error=' + urllib.parse.quote('Ushbu hisob bloklangan'))

        auth_rate_limiter.reset_attempts(request, email)
        auth_login(request, user)
        return redirect('index')

    except Exception as e:
        return redirect(f'/login/?error={urllib.parse.quote("Google orqali kirishda xatolik yuz berdi: " + str(e))}')

