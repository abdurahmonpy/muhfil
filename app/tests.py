import json
from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from app.models import Post, StoryList, Bookmark, Clap, Tag

User = get_user_model()


class MuhfilPlatformTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testauthor',
            email='author@example.com',
            password='SecurePassword123!',
            first_name='Test',
            last_name='Author'
        )
        self.reader = User.objects.create_user(
            username='testreader',
            email='reader@example.com',
            password='SecurePassword123!',
            first_name='Test',
            last_name='Reader'
        )
        self.post = Post.objects.create(
            author=self.user,
            title='Understanding Microservices Architecture',
            subtitle='A deep dive into distributed systems',
            text='<p>Microservices allow teams to scale independently and reliably.</p>',
            plain_text='Microservices allow teams to scale independently and reliably.',
            status='published'
        )

    def test_homepage_loads(self):
        response = self.client.get(reverse('index'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Trending on Muhfil')

    def test_about_page_loads(self):
        response = self.client.get(reverse('about'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Muhfil')

    def test_story_detail_and_get_absolute_url(self):
        url = self.post.get_absolute_url()
        self.assertEqual(url, f'/story/{self.post.slug}/')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.post.title)

    def test_create_and_edit_story_api(self):
        self.client.login(username='testauthor', password='SecurePassword123!')

        # Create
        create_resp = self.client.post(
            reverse('create_post_api'),
            data=json.dumps({
                'title': 'New Story Title',
                'subtitle': 'New Story Subtitle',
                'text': '<p>Here is content with <img src="https://images.unsplash.com/photo-123"></p>',
                'plain_text': 'Here is content',
                'topics': ['Tech', 'Python'],
                'status': 'published'
            }),
            content_type='application/json'
        )
        self.assertEqual(create_resp.status_code, 200)
        data = create_resp.json()
        self.assertTrue(data['success'])
        post_id = data['post_id']

        # Verify auto cover extraction
        created_post = Post.objects.get(pk=post_id)
        self.assertEqual(created_post.cover_url, 'https://images.unsplash.com/photo-123')

        # Edit story using post_id
        edit_resp = self.client.post(
            reverse('create_post_api'),
            data=json.dumps({
                'post_id': post_id,
                'title': 'Updated Story Title',
                'subtitle': 'Updated Subtitle',
                'text': '<p>Updated content.</p>',
                'plain_text': 'Updated content.',
                'topics': ['Tech'],
                'status': 'published'
            }),
            content_type='application/json'
        )
        self.assertEqual(edit_resp.status_code, 200)
        created_post.refresh_from_db()
        self.assertEqual(created_post.title, 'Updated Story Title')

    def test_delete_story_api(self):
        self.client.login(username='testauthor', password='SecurePassword123!')
        del_resp = self.client.post(
            reverse('delete_post_api', kwargs={'post_id': self.post.id})
        )
        self.assertEqual(del_resp.status_code, 200)
        self.assertFalse(Post.objects.filter(pk=self.post.id).exists())

    def test_clap_and_bookmark_apis(self):
        self.client.login(username='testreader', password='SecurePassword123!')

        # Clap
        clap_resp = self.client.post(
            reverse('toggle_clap_api', kwargs={'post_id': self.post.id})
        )
        self.assertEqual(clap_resp.status_code, 200)
        self.assertTrue(clap_resp.json()['liked'])
        self.assertEqual(clap_resp.json()['total_claps'], 1)

        # Bookmark
        bm_resp = self.client.post(
            reverse('toggle_bookmark_api', kwargs={'post_id': self.post.id})
        )
        self.assertEqual(bm_resp.status_code, 200)
        self.assertTrue(bm_resp.json()['is_bookmarked'])

    def test_change_password_api(self):
        self.client.login(username='testauthor', password='SecurePassword123!')
        resp = self.client.post(
            reverse('change_password'),
            data=json.dumps({
                'current_password': 'SecurePassword123!',
                'new_password': 'BrandNewPassword456!',
                'confirm_password': 'BrandNewPassword456!'
            }),
            content_type='application/json'
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()['success'])

        # Check new password works
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNewPassword456!'))

    def test_reading_list_filtering(self):
        self.client.login(username='testauthor', password='SecurePassword123!')
        user_list = StoryList.objects.create(
            user=self.user,
            name='My Favorites',
            description='Handpicked articles'
        )
        user_list.posts.add(self.post)

        # Access with ?list=<id>
        resp = self.client.get(f"{reverse('lists')}?list={user_list.id}")
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'My Favorites')
        self.assertContains(resp, self.post.title)
