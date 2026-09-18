from django.urls import path
from .views import (
    index, feed, feed_redirect, lists, notifications, profile, search,
    settings, stats, story, story_detail, write, about,
    create_post_api, delete_post_api, toggle_clap_api, add_comment_api,
    toggle_bookmark_api, create_list_api, add_to_list_api,
    mark_notifications_read_api
)

urlpatterns = [
    path('', index, name="index"),
    path('', index, name="feed"),
    path('feed/', feed_redirect, name="feed_redirect"),
    path('lists/', lists, name="lists"),
    path('notifications/', notifications, name="notifications"),
    path('profile/', profile, name="profile"),
    path('@<str:username>/', profile, name="user_profile"),
    path('u/<str:username>/', profile, name="profile_user"),
    path('search/', search, name="search"),
    path('settings/', settings, name="settings"),
    path('stats/', stats, name="stats"),
    path('story/', story, name="story"),
    path('story/<slug:slug>/', story_detail, name="story_detail"),
    path('new-story/', write, name="write"),
    path('about/', about, name="about"),

    # REST / AJAX APIs
    path('api/posts/create/', create_post_api, name="create_post_api"),
    path('api/posts/<uuid:post_id>/delete/', delete_post_api, name="delete_post_api"),
    path('api/posts/<uuid:post_id>/clap/', toggle_clap_api, name="toggle_clap_api"),
    path('api/posts/<uuid:post_id>/comment/', add_comment_api, name="add_comment_api"),
    path('api/posts/<uuid:post_id>/bookmark/', toggle_bookmark_api, name="toggle_bookmark_api"),
    path('api/lists/create/', create_list_api, name="create_list_api"),
    path('api/lists/<int:list_id>/add/<uuid:post_id>/', add_to_list_api, name="add_to_list_api"),
    path('api/notifications/read/', mark_notifications_read_api, name="mark_notifications_read_api"),
    path('api/notifications/read-all/', mark_notifications_read_api, name="mark_notifications_read_all_api"),
]
