"""
Kiber xavfsizlik moduli (Cybersecurity & Anti-abuse protections)
- Rate limiting (Brute-force va Credential Stuffing dan himoya)
- Timing attack mitigatsiyasi
- XSS Sanitization (Zararli scriptlar, iframelar va event handlerlarni tozalash)
"""
import re
import html
from django.core.cache import cache
from django.contrib.auth.hashers import check_password, make_password


def get_client_ip(request):
    """Foydalanuvchining haqiqiy IP manzilini xavfsiz aniqlash."""
    if not hasattr(request, 'META'):
        return '127.0.0.1'
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '127.0.0.1')
    return ip


class RateLimiter:
    """
    Kesh (Django cache) asosida ishlaydigan rate-limiter.
    Standart parametr: 5 daqiqada maksimum 5 ta muvaffaqiyatsiz urinish.
    """
    def __init__(self, key_prefix='auth_rate', max_attempts=5, timeout=300):
        self.key_prefix = key_prefix
        self.max_attempts = max_attempts
        self.timeout = timeout

    def _get_key(self, request, identifier=None):
        ip = get_client_ip(request)
        ident_part = f":{identifier.strip().lower()}" if identifier else ""
        return f"{self.key_prefix}:{ip}{ident_part}"

    def is_rate_limited(self, request, identifier=None):
        """Urinishlar soni limitdan oshganligini tekshirish."""
        key = self._get_key(request, identifier)
        attempts = cache.get(key, 0)
        return attempts >= self.max_attempts

    def record_failure(self, request, identifier=None):
        """Muvaffaqiyatsiz urinishni qayd etish."""
        key = self._get_key(request, identifier)
        attempts = cache.get(key, 0) + 1
        cache.set(key, attempts, self.timeout)
        return attempts

    def reset_attempts(self, request, identifier=None):
        """Muvaffaqiyatli kirilganda hisoblagichni tozalash."""
        key = self._get_key(request, identifier)
        cache.delete(key)
        ip_only_key = f"{self.key_prefix}:{get_client_ip(request)}"
        cache.delete(ip_only_key)


# Global rate limiter nusxasi (login, register, google auth)
auth_rate_limiter = RateLimiter(key_prefix='auth_login', max_attempts=5, timeout=300)


# Timing attack mitigatsiyasi uchun lazy soxta parol xeshi
_DUMMY_PASSWORD_HASH = None

def timing_safe_fake_check():
    """Foydalanuvchi mavjud bo'lmaganda doimiy hisoblash vaqtini ta'minlash."""
    global _DUMMY_PASSWORD_HASH
    if _DUMMY_PASSWORD_HASH is None:
        _DUMMY_PASSWORD_HASH = make_password('medium_dummy_password_timing_defense_2026')
    check_password('wrong_password', _DUMMY_PASSWORD_HASH)


# XSS Sanitizer: Ruxsat etilgan teglardan boshqa barcha zararli teglarni olib tashlaydi
DANGEROUS_ATTRS_PATTERN = re.compile(
    r'\s*(on\w+|formaction|form|data-|fs-|action)\s*=\s*(?:["\'][^"\']*["\']|[^\s>]+)',
    re.IGNORECASE
)
JAVASCRIPT_URL_PATTERN = re.compile(
    r'(href|src)\s*=\s*["\']\s*(javascript|data|vbscript):',
    re.IGNORECASE
)
SCRIPT_OR_IFRAME_PATTERN = re.compile(
    r'<\s*(script|iframe|object|embed|applet|form|input|button|style|link|meta|base)\b[^>]*>.*?<\s*/\s*\1\s*>',
    re.IGNORECASE | re.DOTALL
)
SELF_CLOSING_SCRIPT_PATTERN = re.compile(
    r'<\s*(script|iframe|object|embed|applet|form|input|button|style|link|meta|base)\b[^>]*\/?>',
    re.IGNORECASE
)


def sanitize_html(content: str) -> str:
    """
    Maqola va postlar uchun HTML sanitizatsiyasi.
    Scriptlar, iframelar, xavfli javascript: protokoli va on* eventlarini tozalaydi.
    """
    if not content:
        return ""

    text = str(content)

    # 1. script, iframe, object va boshqa xavfli bloklarni butunlay olib tashlash
    text = SCRIPT_OR_IFRAME_PATTERN.sub('', text)
    text = SELF_CLOSING_SCRIPT_PATTERN.sub('', text)

    # 2. on* event handlerlarni (onclick, onerror, onload va h.k.) tozalash
    text = DANGEROUS_ATTRS_PATTERN.sub('', text)

    # 3. href va src lardagi javascript: yoki vbscript: havolalarini zararsizlantirish
    text = JAVASCRIPT_URL_PATTERN.sub(r'\1="#"', text)

    return text.strip()


def sanitize_plain_text(content: str) -> str:
    """
    Sharhlar, bios va oddiy matnlar uchun to'liq HTML qochirish (HTML escape).
    """
    if not content:
        return ""
    return html.escape(str(content).strip())
