import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / '.env')
except Exception:
    pass


SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-&$v_br%4gv!huqdc)#=^b7t^-gxo@js11apc(w)81+zb5lo^13')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')

ALLOWED_HOSTS = ['*']

CSRF_TRUSTED_ORIGINS = [
    'https://*.railway.app',
    'https://*.up.railway.app',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
]
railway_domain = os.environ.get('RAILWAY_PUBLIC_DOMAIN')
if railway_domain:
    CSRF_TRUSTED_ORIGINS.append(f'https://{railway_domain}')


# Application definition

INSTALLED_APPS = [
    'jazzmin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'app',
    'user',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

AUTH_USER_MODEL = 'user.User'

ROOT_URLCONF = 'conf.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
                'app.context_processors.global_context',
            ],
        },
    },
]

LOGIN_URL = 'login'
LOGIN_REDIRECT_URL = 'index'
LOGOUT_REDIRECT_URL = 'index'

WSGI_APPLICATION = 'conf.wsgi.application'


# Database & Persistent Storage (Railway Volume Support)
import dj_database_url
import shutil

DATA_VOLUME_DIR = None
env_mount = os.environ.get('RAILWAY_VOLUME_MOUNT_PATH') or os.environ.get('DATA_DIR')
if env_mount:
    try:
        p = Path(env_mount)
        if p.exists() or p.is_absolute():
            DATA_VOLUME_DIR = p
    except Exception:
        pass

if not DATA_VOLUME_DIR and os.path.exists('/data') and os.path.isdir('/data'):
    DATA_VOLUME_DIR = Path('/data')

if DATA_VOLUME_DIR:
    try:
        DATA_VOLUME_DIR.mkdir(parents=True, exist_ok=True)
        sqlite_file = DATA_VOLUME_DIR / 'db.sqlite3'
        # Seed initial database from repository if volume is freshly mounted and empty
        base_db = BASE_DIR / 'db.sqlite3'
        if not sqlite_file.exists() and base_db.exists():
            shutil.copy2(base_db, sqlite_file)
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': sqlite_file,
            }
        }
        MEDIA_ROOT = DATA_VOLUME_DIR / 'media'
    except Exception:
        DATABASES = {
            'default': {
                'ENGINE': 'django.db.backends.sqlite3',
                'NAME': BASE_DIR / 'db.sqlite3',
            }
        }
        MEDIA_ROOT = BASE_DIR / 'media'
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
    MEDIA_ROOT = BASE_DIR / 'media'

MEDIA_ROOT.mkdir(parents=True, exist_ok=True)

DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    DATABASES['default'] = dj_database_url.config(
        default=DATABASE_URL,
        conn_max_age=600,
        conn_health_checks=True,
    )


# Password validation
# https://docs.djangoproject.com/en/6.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'ru'

TIME_ZONE = 'Asia/Tashkent'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / 'static'
]
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATIC_ROOT.mkdir(parents=True, exist_ok=True)
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

# ==============================================================================
# EMAIL CONFIGURATION (SMTP & Verification Codes)
# ==============================================================================
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 't')
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', f"Muhfil <{EMAIL_HOST_USER or 'noreply@muhfil.uz'}>")

if EMAIL_HOST_USER and EMAIL_HOST_PASSWORD:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
else:
    EMAIL_BACKEND = os.environ.get('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')

# ==============================================================================
# CACHE CONFIGURATION (Rate Limiting & Anti-abuse)
# ==============================================================================
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'medium-security-cache',
        'TIMEOUT': 300,
    }
}

# ==============================================================================
# KIBER XAVFSIZLIK VA AUTH HIMOYASI (Cybersecurity Settings)
# ==============================================================================
# Session o'g'irlanishining (Session Hijacking & XSS cookie theft) oldini olish
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 1209600  # 14 kunlik sessiya

# CSRF xavfsizligi (Cross-Site Request Forgery)
CSRF_COOKIE_HTTPONLY = False  # JavaScript fetch X-CSRFToken orqali o'qishi uchun xavfsiz ochiq
CSRF_COOKIE_SAMESITE = 'Lax'

# Clickjacking va MIME sniffing himoyasi
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Railway / Reverse Proxy HTTPS header
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ==============================================================================
# DJANGO JAZZMIN ADMIN PANEL SOZLAMALARI
# ==============================================================================
JAZZMIN_SETTINGS = {
    "site_title": "Muhfil Admin",
    "site_header": "Muhfil",
    "site_brand": "Muhfil Admin",
    "welcome_sign": "Muhfil Boshqaruv Paneliga Xush Kelibsiz!",
    "copyright": "Muhfil LLC",
    "search_model": ["app.Post", "user.User"],
    "user_avatar": "avatar",
    "topmenu_links": [
        {"name": "Bosh sahifa", "url": "index", "permissions": ["auth.view_user"]},
        {"name": "Tasma (Feed)", "url": "feed"},
        {"name": "Yangi maqola", "url": "write"},
    ],
    "usermenu_links": [
        {"name": "Profilim", "url": "profile", "icon": "fas fa-user"},
        {"name": "Sozlamalar", "url": "settings", "icon": "fas fa-cog"},
    ],
    "show_sidebar": True,
    "navigation_expanded": True,
    "hide_apps": [],
    "hide_models": [],
    "order_with_respect_to": ["user", "app"],
    "icons": {
        "auth": "fas fa-users-cog",
        "auth.Group": "fas fa-users",
        "user.User": "fas fa-user-circle",
        "app.Post": "fas fa-newspaper",
        "app.Tag": "fas fa-tags",
        "app.Clap": "fas fa-thumbs-up",
        "app.Comment": "fas fa-comments",
        "app.Bookmark": "fas fa-bookmark",
        "app.StoryList": "fas fa-layer-group",
        "app.Notification": "fas fa-bell",
    },
    "default_icon_parents": "fas fa-chevron-circle-right",
    "default_icon_children": "fas fa-circle",
    "related_modal_active": True,
    "show_ui_builder": False,
    "changeform_format": "horizontal_tabs",
    "changeform_format_overrides": {
        "user.user": "collapsible",
        "app.post": "horizontal_tabs",
    },
}

JAZZMIN_UI_TWEAKS = {
    "navbar_small_text": False,
    "footer_small_text": False,
    "body_small_text": False,
    "brand_small_text": False,
    "brand_colour": "navbar-dark",
    "accent": "accent-success",
    "navbar": "navbar-dark",
    "no_navbar_border": False,
    "navbar_fixed": False,
    "layout_boxed": False,
    "footer_fixed": False,
    "sidebar_fixed": True,
    "sidebar": "sidebar-dark-success",
    "sidebar_nav_small_text": False,
    "sidebar_disable_expand": False,
    "sidebar_nav_child_indent": True,
    "sidebar_nav_compact_style": False,
    "sidebar_nav_legacy_style": False,
    "sidebar_nav_flat_style": False,
    "theme": "darkly",
    "default_theme_mode": "dark",
    "button_classes": {
        "primary": "btn-outline-primary",
        "secondary": "btn-outline-secondary",
        "info": "btn-outline-info",
        "warning": "btn-outline-warning",
        "danger": "btn-outline-danger",
        "success": "btn-outline-success"
    }
}

# ==============================================================================
# GOOGLE OAUTH 2.0 CREDENTIALS
# ==============================================================================
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')


