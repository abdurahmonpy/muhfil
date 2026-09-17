from django.urls import path
from .views import (
    register_view, login_view, logout_view, toggle_follow_view,
    update_settings_view, change_password_view,
    google_auth_view, google_auth_callback_view
)

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('auth/google/', google_auth_view, name='google_auth'),
    path('auth/google/callback/', google_auth_callback_view, name='google_auth_callback'),
    path('api/auth/google/', google_auth_view, name='api_google_auth'),
    path('api/auth/register/', register_view, name='api_register'),
    path('api/auth/login/', login_view, name='api_login'),
    path('api/user/<int:user_id>/follow/', toggle_follow_view, name='toggle_follow_id'),
    path('api/user/follow/', toggle_follow_view, name='toggle_follow_json'),
    path('api/user/settings/', update_settings_view, name='update_settings'),
    path('api/user/password/', change_password_view, name='change_password'),
]
