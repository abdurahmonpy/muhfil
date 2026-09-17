from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from app.models import Post, Tag, Clap, Comment, Bookmark, StoryList, Notification

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds database with initial users, topics, stories, claps, and comments'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database with realistic Medium content...')

        # 1. Admin Superuser
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@medium.local',
                'first_name': 'Admin',
                'last_name': 'Superuser',
                'is_staff': True,
                'is_superuser': True,
                'membership_tier': 'Medium Member',
                'bio': 'Platform administrator and senior engineer.'
            }
        )
        if created:
            admin.set_password('admin12345')
            admin.save()
            self.stdout.write('Created superuser: admin / admin12345')

        # 2. Demo Authors
        users_data = [
            {
                'username': 'sarah_jenkins',
                'email': 'sarah@example.com',
                'first_name': 'Sarah',
                'last_name': 'Jenkins',
                'bio': 'Staff Architect & Author. Writing about distributed architectures, high-performance web systems, and engineering leadership.',
                'tier': 'Medium Member'
            },
            {
                'username': 'sumit_pandey',
                'email': 'sumit@example.com',
                'first_name': 'Sumit',
                'last_name': 'Pandey',
                'bio': 'Deep Learning researcher and full-stack software engineer. Writing about AI, PyTorch, and clean architecture.',
                'tier': 'Medium Member'
            },
            {
                'username': 'elena_rostova',
                'email': 'elena@example.com',
                'first_name': 'Elena',
                'last_name': 'Rostova',
                'bio': 'Senior Backend Engineer specializing in Python, async event loops, PostgreSQL performance tuning, and Django scaling.',
                'tier': 'Medium Member'
            },
            {
                'username': 'alex_rivera',
                'email': 'alex@example.com',
                'first_name': 'Alex',
                'last_name': 'Rivera',
                'bio': 'Design engineer and typography enthusiast. Passionate about minimalist UI, accessibility, and high-performance frontend.',
                'tier': 'Free Member'
            },
        ]

        authors = {}
        for u in users_data:
            user, created = User.objects.get_or_create(
                username=u['username'],
                defaults={
                    'email': u['email'],
                    'first_name': u['first_name'],
                    'last_name': u['last_name'],
                    'bio': u['bio'],
                    'membership_tier': u['tier'],
                }
            )
            if created:
                user.set_password('password123')
                user.save()
            authors[u['username']] = user

        # Following graph
        authors['sarah_jenkins'].following.add(authors['sumit_pandey'], authors['elena_rostova'])
        authors['sumit_pandey'].following.add(authors['sarah_jenkins'], authors['alex_rivera'])
        authors['elena_rostova'].following.add(authors['sarah_jenkins'], authors['sumit_pandey'])
        authors['alex_rivera'].following.add(authors['sarah_jenkins'])
        if admin:
            admin.following.add(authors['sarah_jenkins'], authors['sumit_pandey'])

        # 3. Tags / Topics
        tag_names = ['Architecture', 'Python', 'Django', 'Machine Learning', 'Programming', 'Clean Code', 'Design', 'Productivity']
        tags = {}
        for tname in tag_names:
            tag, _ = Tag.objects.get_or_create(name=tname)
            tags[tname] = tag

        # 4. Stories / Posts
        s1_html = '''<p>When engineering web applications that serve millions of concurrent requests, complexity is your biggest adversary. Every microservice boundary, distributed cache layer, and asynchronous worker queue introduces failure points, latency overhead, and cognitive friction for your development team.</p>
<h2>1. Simplicity as a Strategic Advantage</h2>
<p>Modern engineering culture often confuses architectural maturity with tool saturation. A monolith constructed with clean domain boundaries, explicit interfaces, and rigorous database indexing consistently outperforms a disorganized web of twenty distributed services.</p>
<blockquote>Clean architecture is not about building layers for the sake of layers; it is about creating strict boundaries where business logic remains isolated from framework machinery.</blockquote>
<h2>2. The Core Service Pattern</h2>
<p>Consider how a clean service layer structures operations in Python:</p>
<pre><code>class StoryPublishService:
    def __init__(self, user: User, payload: dict):
        self.user = user
        self.payload = payload

    def execute(self) -> Post:
        story = Post.objects.create(
            author=self.user,
            title=self.payload['title'],
            text=self.payload['body'],
            status='published'
        )
        return story</code></pre>
<p>Notice how readable and testable this approach is. Every component has a single responsibility. Before you introduce another queue or a new microservice, ask yourself: Can this problem be solved with an indexed database table, clean caching, and well-structured modular code? In nine out of ten cases, the answer is an emphatic yes.</p>'''

        stories_data = [
            {
                'author': authors['sarah_jenkins'],
                'title': 'The Architecture of Modern Web Systems: Scalability, Simplicity, and Clean Code',
                'subtitle': 'How thoughtful engineering principles and minimalist patterns outshine over-engineered hype in high-concurrency production environments.',
                'slug': 'the-architecture-of-modern-web-systems',
                'cover_url': 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1000&h=600&fit=crop',
                'tags': [tags['Architecture'], tags['Clean Code'], tags['Programming'], tags['Python'], tags['Django']],
                'views': 4820,
                'reads': 2940,
                'text': s1_html,
                'plain_text': 'When engineering web applications that serve millions of concurrent requests, complexity is your biggest adversary. Simplicity as a Strategic Advantage. A monolith constructed with clean domain boundaries, explicit interfaces, and rigorous database indexing consistently outperforms a disorganized web of distributed services.',
            },
            {
                'author': authors['sumit_pandey'],
                'title': 'When I See This Code Pattern, I Immediately Refactor',
                'subtitle': 'It is pretty damn obvious now that I know what to look for. Here is the exact mental checklist I use when reviewing high-throughput pull requests.',
                'slug': 'when-i-see-this-code-pattern-refactor',
                'cover_url': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&h=600&fit=crop',
                'tags': [tags['Programming'], tags['Clean Code'], tags['Python']],
                'views': 8420,
                'reads': 5100,
                'text': '''<p>Over the past decade of reviewing thousands of production pull requests, I have noticed that the most catastrophic bugs rarely come from complex algorithmic math. They come from subtle state mutations and hidden side effects.</p><h2>The Red Flag: Multiple Responsibilities in One Function</h2><p>Whenever a function fetches database records, validates permissions, mutates local parameters, and emits side effects all in the same 80 lines, you are guaranteed to encounter race conditions down the line.</p><p>Refactoring these into idempotent, single-purpose functions transforms debugging from a nightmare into a breeze.</p>''',
                'plain_text': 'Over the past decade of reviewing thousands of production pull requests, I have noticed that the most catastrophic bugs rarely come from complex algorithmic math. They come from subtle state mutations and hidden side effects.',
            },
            {
                'author': authors['elena_rostova'],
                'title': 'Why Python 3.13 and Django 6 Change Everything for Backend Systems',
                'subtitle': 'Free-threaded Python without the GIL, native async improvements, and database optimizations that dramatically reduce cloud infrastructure costs.',
                'slug': 'why-python-django-change-backend-systems',
                'cover_url': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1000&h=600&fit=crop',
                'tags': [tags['Python'], tags['Django'], tags['Architecture']],
                'views': 6120,
                'reads': 3820,
                'text': '''<p>The release of Python with free-threading options and Django modern concurrency models represents the most significant leap forward for server-side Python in over a decade.</p><h2>Unlocking True Multi-Core Execution</h2><p>With GIL-free execution paths, CPU-bound tasks such as serialization, heavy data processing, and document formatting can now leverage all available CPU cores without spawning separate multi-process workers with heavy IPC overhead.</p>''',
                'plain_text': 'The release of Python with free-threading options and Django modern concurrency models represents the most significant leap forward for server-side Python in over a decade.',
            },
            {
                'author': authors['alex_rivera'],
                'title': 'Designing for Focus: Why Medium-Style Minimal Typography Endures',
                'subtitle': 'A deep dive into line-height ratios, typographic scales, and why high-contrast distraction-free interfaces maximize human reading comprehension.',
                'slug': 'designing-for-focus-minimal-typography',
                'cover_url': 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&h=600&fit=crop',
                'tags': [tags['Design'], tags['Productivity']],
                'views': 3240,
                'reads': 2100,
                'text': '''<p>When Ev Williams and the early Medium design team introduced the single-column centered reading experience, it fundamentally transformed how we perceive long-form text on digital screens.</p><h2>The Science of Golden Proportions in Type</h2><p>A measure of 60 to 75 characters per line coupled with a 1.58 line height matches the natural saccadic movement of human eyes, reducing cognitive fatigue during extended reading sessions.</p>''',
                'plain_text': 'When Ev Williams and the early Medium design team introduced the single-column centered reading experience, it fundamentally transformed how we perceive long-form text on digital screens.',
            }
        ]

        created_posts = []
        for sdata in stories_data:
            post, created = Post.objects.get_or_create(
                slug=sdata['slug'],
                defaults={
                    'author': sdata['author'],
                    'title': sdata['title'],
                    'subtitle': sdata['subtitle'],
                    'text': sdata['text'],
                    'plain_text': sdata['plain_text'],
                    'cover_url': sdata['cover_url'],
                    'status': 'published',
                    'views_count': sdata['views'],
                    'reads_count': sdata['reads'],
                }
            )
            post.tags.set(sdata['tags'])
            created_posts.append(post)

        # 5. Claps
        for p in created_posts:
            for u in authors.values():
                if u != p.author:
                    Clap.objects.get_or_create(
                        post=p,
                        user=u,
                        defaults={'count': 25}
                    )

        # 6. Comments
        Comment.objects.get_or_create(
            post=created_posts[0],
            user=authors['elena_rostova'],
            defaults={
                'text': 'Tremendous writeup Sarah. The point on single responsibility in service layers is something too many teams overlook until maintenance costs skyrocket.',
                'claps_count': 14
            }
        )
        Comment.objects.get_or_create(
            post=created_posts[0],
            user=authors['sumit_pandey'],
            defaults={
                'text': 'Totally agree on avoiding distributed queues before you actually need them. Clean indexing and atomic DB updates take you surprisingly far.',
                'claps_count': 8
            }
        )

        # 7. Bookmarks & Lists
        for u in authors.values():
            rlist, _ = StoryList.objects.get_or_create(
                user=u,
                name='Reading list',
                defaults={'description': 'Saved stories to read later', 'is_private': True}
            )
            for p in created_posts[:2]:
                if p.author != u:
                    Bookmark.objects.get_or_create(user=u, post=p)
                    rlist.posts.add(p)

        # 8. Notifications
        Notification.objects.get_or_create(
            recipient=authors['sarah_jenkins'],
            actor=authors['sumit_pandey'],
            verb='clapped for your story The Architecture of Modern Web Systems',
            defaults={'target_post': created_posts[0], 'is_read': False}
        )
        Notification.objects.get_or_create(
            recipient=authors['sarah_jenkins'],
            actor=authors['elena_rostova'],
            verb='started following you',
            defaults={'is_read': False}
        )

        self.stdout.write(self.style.SUCCESS('Successfully seeded database!'))
