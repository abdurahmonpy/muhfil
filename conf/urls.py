from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.conf.urls.static import static
from django.conf import settings
from django.http import HttpResponse

def serve_avatar_fallback(request, path):
    # 1. Try MEDIA_ROOT / 'avatars' / path
    p = Path(settings.MEDIA_ROOT) / 'avatars' / path
    if p.exists() and p.is_file():
        return serve(request, path, document_root=str(Path(settings.MEDIA_ROOT) / 'avatars'))
    
    # 2. Try MEDIA_ROOT / path
    p2 = Path(settings.MEDIA_ROOT) / path
    if p2.exists() and p2.is_file():
        return serve(request, path, document_root=str(settings.MEDIA_ROOT))

    # 3. Try BASE_DIR / 'media' / 'avatars' / path
    p3 = Path(settings.BASE_DIR) / 'media' / 'avatars' / path
    if p3.exists() and p3.is_file():
        return serve(request, path, document_root=str(p3.parent))

    # 4. If missing, return an elegant default SVG avatar instead of 404
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">'
        '<circle cx="64" cy="64" r="64" fill="#E5E7EB"/>'
        '<circle cx="64" cy="48" r="22" fill="#9CA3AF"/>'
        '<path d="M24,108 C24,84 42,74 64,74 C86,74 104,84 104,108" fill="#9CA3AF"/>'
        '</svg>'
    )
    return HttpResponse(svg, content_type='image/svg+xml')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('user.urls')),
    path('', include('app.urls')),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += [
    re_path(r'^media/avatars/(?P<path>.*)$', serve_avatar_fallback),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^avatars/(?P<path>.*)$', serve_avatar_fallback),
]


