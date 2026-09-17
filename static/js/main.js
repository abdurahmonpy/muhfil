function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

/**
 * Medium Clone - Pure Frontend JavaScript
 * Handles all UI animations, interactivity, modals, claps, bookmarks, and theme switching.
 * Strictly UI/Client-side: No backend dependencies.
 */

document.addEventListener('DOMContentLoaded', () => {
  initPageTransitions();
  initTheme();
  initActiveNav();        // ← Auto-highlight current page in sidebar
  initNavbarScroll();
  initDropdowns();
  initModals();
  initClaps();
  initBookmarks();
  initFollowButtons();
  initResponsesDrawer();
  initReadingProgressBar();
  initAudioListen();
  initShareActions();
  initTabs();
  initToastContainer();
  initSidebarToggle();
  initTopicPills();
  initReposts();
  initLessLikeThis();
  initStoryMenuActions();
  initSkeletonLoaders();
  initClickableCards();   // ← Make article cards fully clickable
  initGlobalActions();    // ← Universal action handlers for all buttons & links
  initYouTubeCards();     // ← Play YouTube video cards on click
  initPasswordChange();   // ← Password change AJAX handler
  initScrollReveal();     // ← Staggered smooth entrance for story cards
  initStoryReadingProgress(); // ← Reading progress indicator at viewport top
});

/* ==========================================================================
   Global Animated Cloud Loader Controls
   ========================================================================== */
window.showLoadingAnimation = function(message = 'Loading...') {
  const preloader = document.getElementById('app-preloader');
  if (!preloader) return;
  const textEl = preloader.querySelector('.preloader-text');
  if (textEl && message) textEl.textContent = message;
  preloader.classList.remove('preloader-hidden');
};

window.hideLoadingAnimation = function() {
  const preloader = document.getElementById('app-preloader');
  if (!preloader) return;
  preloader.classList.add('preloader-hidden');
};

/* ==========================================================================
   0. Page Transitions (Smooth entrance & exit animations + Top Progress Bar)
   ========================================================================== */
function initPageTransitions() {
  // Ensure animated cloud preloader is hidden once DOM is ready
  window.hideLoadingAnimation();
  window.addEventListener('load', () => {
    window.hideLoadingAnimation();
  });

  // 1. Create or get top progress bar
  let bar = document.getElementById('page-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'page-progress-bar';
    document.body.prepend(bar);
  }

  // 2. Select main content container for smooth entrance
  const mainTarget = document.querySelector('main') ||
                     document.querySelector('.medium-app-layout > .flex-1') ||
                     document.querySelector('.medium-app-layout') ||
                     document.querySelector('.medium-landing-page');

  if (mainTarget) {
    mainTarget.classList.add('page-enter-animation');
  }

  // 3. Body fade in
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.22s ease-in';
      document.body.style.opacity = '1';
    });
  });

  // 4. Finish progress bar on load
  bar.style.opacity = '1';
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.opacity = '0';
    setTimeout(() => { bar.style.width = '0%'; }, 200);
  }, 240);

  // 5. Intercept internal links for smooth transition out
  document.addEventListener('click', (e) => {
    // Skip if clicking interactive non-navigating elements
    if (e.target.closest('[data-auth-modal], [data-modal-open], [data-modal-close], button, .no-transition')) {
      return;
    }

    const anchor = e.target.closest('a[href]');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript') ||
      href.startsWith('mailto') ||
      href.startsWith('tel') ||
      href.startsWith('http') ||
      anchor.target === '_blank' ||
      anchor.hasAttribute('download')
    ) return;

    // Skip if clicking link to current page with hash
    if (anchor.pathname === window.location.pathname && anchor.search === window.location.search && anchor.hash) {
      return;
    }

    e.preventDefault();

    // Start progress bar animation
    bar.style.transition = 'width 0.26s cubic-bezier(0.1, 0.8, 0.2, 1), opacity 0.15s ease';
    bar.style.opacity = '1';
    bar.style.width = '75%';

    // Exit animation on content
    if (mainTarget) {
      mainTarget.classList.remove('page-enter-animation');
      mainTarget.classList.add('page-exit-animation');
    }
    document.body.style.transition = 'opacity 0.18s ease-out';
    document.body.style.opacity = '0.7';

    setTimeout(() => {
      bar.style.width = '100%';
      window.location.href = href;
    }, 170);
  });

  // 6. Restore states on browser back/forward buttons
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.style.transition = 'none';
      document.body.style.opacity = '1';
      if (mainTarget) {
        mainTarget.classList.remove('page-exit-animation');
        mainTarget.classList.add('page-enter-animation');
      }
      bar.style.opacity = '0';
      bar.style.width = '0%';
    }
  });
}

/* ==========================================================================
   1. Theme Management (Dark / Light Mode)
   ========================================================================== */
function initTheme() {
  // Public Medium landing page always preserves authentic cream brand
  if (document.body && document.body.classList.contains('medium-landing-page')) {
    document.documentElement.classList.remove('dark');
    return;
  }

  const savedTheme = localStorage.getItem('medium_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else if (savedTheme === 'light') {
    document.documentElement.classList.remove('dark');
  } else if (prefersDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcons();

  document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
    if (btn.dataset.themeBound) return;
    btn.dataset.themeBound = 'true';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      document.documentElement.classList.add('theme-switching');
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('medium_theme', isDark ? 'dark' : 'light');
      updateThemeIcons();
      showToast(isDark ? 'Dark theme enabled' : 'Light theme enabled');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-switching');
      }, 300);
    });
  });
}

function updateThemeIcons() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('[data-action="toggle-theme"]').forEach(btn => {
    const sunIcon = btn.querySelector('.theme-icon-sun');
    const moonIcon = btn.querySelector('.theme-icon-moon');
    if (sunIcon && moonIcon) {
      if (isDark) {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
      } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
      }
    }
  });
}

/* ==========================================================================
   2. Navbar Scroll Dynamics (Medium yellow to white on landing page)
   ========================================================================== */
function initNavbarScroll() {
  const landingNav = document.getElementById('landing-navbar');
  const heroSection = document.getElementById('landing-hero');
  const getStartedBtn = document.getElementById('nav-get-started-btn');

  if (!landingNav) return;

  const handleScroll = () => {
    const threshold = heroSection ? heroSection.offsetHeight - 80 : 100;
    if (window.scrollY > threshold) {
      landingNav.classList.remove('bg-medium-yellow-hero', 'border-black');
      landingNav.classList.add('bg-white', 'dark:bg-[#121212]', 'border-gray-200', 'dark:border-[#2f2f2f]', 'shadow-sm');
      if (getStartedBtn) {
        getStartedBtn.classList.remove('bg-medium-dark', 'text-white');
        getStartedBtn.classList.add('bg-medium-green', 'hover:bg-medium-green-hover', 'text-white');
      }
    } else {
      landingNav.classList.add('bg-medium-yellow-hero', 'border-black');
      landingNav.classList.remove('bg-white', 'dark:bg-[#121212]', 'border-gray-200', 'dark:border-[#2f2f2f]', 'shadow-sm');
      if (getStartedBtn) {
        getStartedBtn.classList.add('bg-medium-dark', 'text-white');
        getStartedBtn.classList.remove('bg-medium-green', 'hover:bg-medium-green-hover', 'text-white');
      }
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/* ==========================================================================
   3. Dropdown Menus
   ========================================================================== */
function initDropdowns() {
  document.querySelectorAll('[data-dropdown-toggle]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = trigger.getAttribute('data-dropdown-toggle');
      const targetMenu = document.getElementById(targetId);
      
      // Close any other open dropdowns
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        if (menu !== targetMenu) menu.classList.add('hidden');
      });

      if (targetMenu) {
        targetMenu.classList.toggle('hidden');
      }
    });
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown-menu') && !e.target.closest('[data-dropdown-toggle]')) {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  });

  // ESC key to close dropdowns
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.classList.add('hidden');
      });
    }
  });
}

/* ==========================================================================
   4. Modals System (Auth modal, Create List modal, Edit profile)
   ========================================================================== */
function initModals() {
  // Open modal
  document.querySelectorAll('[data-modal-open]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const modalId = btn.getAttribute('data-modal-open');
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      }
    });
  });

  // Close modal
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-backdrop');
      if (modal) {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    });
  });

  // Backdrop click closes modal
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    });
  });

  // ESC key closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.classList.add('hidden');
      });
      document.body.classList.remove('overflow-hidden');
    }
  });

  // Auth Modal Tab Switcher (Sign In vs Sign Up)
  const authTabSignIn = document.getElementById('auth-tab-signin');
  const authTabSignUp = document.getElementById('auth-tab-signup');
  const authViewSignIn = document.getElementById('auth-view-signin');
  const authViewSignUp = document.getElementById('auth-view-signup');

  if (authTabSignIn && authTabSignUp && authViewSignIn && authViewSignUp) {
    authTabSignIn.addEventListener('click', () => {
      authViewSignIn.classList.remove('hidden');
      authViewSignUp.classList.add('hidden');
      authTabSignIn.classList.add('font-bold', 'text-medium-dark', 'dark:text-white', 'border-b-2', 'border-medium-dark', 'dark:border-white');
      authTabSignIn.classList.remove('text-gray-500');
      authTabSignUp.classList.remove('font-bold', 'text-medium-dark', 'dark:text-white', 'border-b-2', 'border-medium-dark', 'dark:border-white');
      authTabSignUp.classList.add('text-gray-500');
    });

    authTabSignUp.addEventListener('click', () => {
      authViewSignUp.classList.remove('hidden');
      authViewSignIn.classList.add('hidden');
      authTabSignUp.classList.add('font-bold', 'text-medium-dark', 'dark:text-white', 'border-b-2', 'border-medium-dark', 'dark:border-white');
      authTabSignUp.classList.remove('text-gray-500');
      authTabSignIn.classList.remove('font-bold', 'text-medium-dark', 'dark:text-white', 'border-b-2', 'border-medium-dark', 'dark:border-white');
      authTabSignIn.classList.add('text-gray-500');
    });
  }
}

/* ==========================================================================
   5. Medium Claps with Floating +1 Animation & Counter Isolation
   ========================================================================== */
function parseCount(str) {
  if (!str) return 0;
  str = str.trim().toUpperCase();
  if (str.endsWith('K')) {
    return Math.round(parseFloat(str.slice(0, -1)) * 1000);
  }
  if (str.endsWith('M')) {
    return Math.round(parseFloat(str.slice(0, -1)) * 1000000);
  }
  return parseInt(str.replace(/,/g, ''), 10) || 0;
}

function formatCount(num, originalStr) {
  if (originalStr && originalStr.toUpperCase().endsWith('K') && num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  if (originalStr && originalStr.toUpperCase().endsWith('M') && num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

function updateLikeButtonUI(btn, isLiked, totalClaps) {
  btn.setAttribute('data-liked', isLiked ? 'true' : 'false');
  const countEl = btn.querySelector('.clap-count');
  if (countEl && typeof totalClaps === 'number') {
    countEl.textContent = formatCount(totalClaps);
  }

  const icon = btn.querySelector('svg, i');
  if (isLiked) {
    btn.classList.add('text-medium-green');
    if (icon) icon.classList.add('text-medium-green');
  } else {
    btn.classList.remove('text-medium-green');
    if (icon) icon.classList.remove('text-medium-green');
  }
}

function syncAllLikeButtons(postId, isLiked, totalClaps) {
  if (!postId) return;
  document.querySelectorAll(`[data-action="clap"][data-post-id="${postId}"]`).forEach(btn => {
    updateLikeButtonUI(btn, isLiked, totalClaps);
  });
}

function createClapParticles(container) {
  if (!container) return;
  container.style.position = 'relative';
  const colors = ['#1a8917', '#22c55e', '#10b981', '#f59e0b', '#3b82f6'];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span');
    p.className = 'clap-particle';
    const angle = (i / count) * 360 + (Math.random() * 24 - 12);
    const distance = 24 + Math.random() * 18;
    const tx = Math.cos(angle * Math.PI / 180) * distance;
    const ty = Math.sin(angle * Math.PI / 180) * distance - 10;
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    p.style.left = '50%';
    p.style.top = '50%';
    container.appendChild(p);
    setTimeout(() => p.remove(), 680);
  }
}

function attachClapListener(clapBtn) {
  if (clapBtn.dataset.clapInitialized === 'true') return;
  clapBtn.dataset.clapInitialized = 'true';

  clapBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const postId = clapBtn.dataset.postId || (clapBtn.closest('[data-post-id]') ? clapBtn.closest('[data-post-id]').dataset.postId : null);
    if (!postId) return;

    const countEl = clapBtn.querySelector('.clap-count');
    const currentCount = parseCount(countEl ? countEl.textContent : '0');
    const currentlyLiked = clapBtn.getAttribute('data-liked') === 'true';
    const newLiked = !currentlyLiked;
    const newCount = newLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    // 1. Sahifadagi barcha bir xil post like tugmalarini bir zumda sinxron yangilash (Optimistic UI)
    syncAllLikeButtons(postId, newLiked, newCount);

    // Elastik tebranish va pop animatsiyasi
    clapBtn.classList.remove('animate-clap-pop');
    void clapBtn.offsetWidth;
    clapBtn.classList.add('animate-clap-pop');
    setTimeout(() => {
      clapBtn.classList.remove('animate-clap-pop');
    }, 460);

    // Faqat like qo'shilganda +1 va rang-barang zarrachalar (particles) otilishi
    if (newLiked) {
      createClapParticles(clapBtn);
      const floatBadge = document.createElement('div');
      floatBadge.className = 'absolute -top-6 left-1/2 -translate-x-1/2 bg-medium-green text-white font-bold text-xs px-2 py-0.5 rounded-full shadow pointer-events-none animate-clap-rise z-50';
      floatBadge.textContent = '+1';
      clapBtn.style.position = 'relative';
      clapBtn.appendChild(floatBadge);
      setTimeout(() => {
        floatBadge.remove();
      }, 850);
    }

    // 2. Serverga xavfsiz so'rov yuborish
    fetch(`/api/posts/${postId}/clap/`, {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
      }
    })
    .then(res => {
      if (res.status === 401) {
        syncAllLikeButtons(postId, currentlyLiked, currentCount);
        if (typeof openAuthModal === 'function') {
          openAuthModal('signin');
        } else {
          window.location.href = '/login/';
        }
        return null;
      }
      return res.json();
    })
    .then(data => {
      if (!data) return;
      if (data.success) {
        syncAllLikeButtons(postId, data.liked, data.total_claps);
      } else {
        syncAllLikeButtons(postId, currentlyLiked, currentCount);
        if (data.error) showToast(data.error);
      }
    })
    .catch(err => {
      console.log('Clap error:', err);
      syncAllLikeButtons(postId, currentlyLiked, currentCount);
    });
  });
}

function initClaps() {
  document.querySelectorAll('[data-action="clap"]').forEach(clapBtn => {
    attachClapListener(clapBtn);
  });
}

/* ==========================================================================
   6. Bookmarks / Reading List Toggle
   ========================================================================== */
function initBookmarks() {
  document.querySelectorAll('[data-action="bookmark"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isBookmarked = btn.getAttribute('data-bookmarked') === 'true';
      const newBookmarked = !isBookmarked;
      btn.setAttribute('data-bookmarked', newBookmarked ? 'true' : 'false');

      const outlineIcon = btn.querySelector('.bookmark-outline');
      const filledIcon = btn.querySelector('.bookmark-filled');

      if (outlineIcon && filledIcon) {
        if (newBookmarked) {
          outlineIcon.classList.add('hidden');
          filledIcon.classList.remove('hidden');
          filledIcon.classList.add('text-black', 'dark:text-white', 'animate-bookmark-pop');
          setTimeout(() => filledIcon.classList.remove('animate-bookmark-pop'), 450);
          showToast('Saved to your Reading list');
          updateReadingListCount(1);
        } else {
          outlineIcon.classList.remove('hidden');
          filledIcon.classList.add('hidden');
          showToast('Removed from Reading list');
          updateReadingListCount(-1);
        }
      } else {
        // Direct icon button toggle
        const icon = btn.querySelector('i') || (btn.tagName === 'I' ? btn : null);
        if (icon) {
          if (newBookmarked) {
            icon.classList.remove('bi-bookmark');
            icon.classList.add('bi-bookmark-fill', 'text-black', 'dark:text-white', 'animate-bookmark-pop');
            setTimeout(() => icon.classList.remove('animate-bookmark-pop'), 450);
            showToast('Saved to your Reading list');
            updateReadingListCount(1);
          } else {
            icon.classList.remove('bi-bookmark-fill', 'text-black', 'dark:text-white');
            icon.classList.add('bi-bookmark');
            showToast('Removed from Reading list');
            updateReadingListCount(-1);
          }
        }
      }

      const postId = btn.dataset.postId || (btn.closest('[data-post-id]') ? btn.closest('[data-post-id]').dataset.postId : null);
      if (postId) {
        fetch(`/api/posts/${postId}/bookmark/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
          }
        })
        .then(res => res.json())
        .catch(err => console.log('Bookmark error:', err));
      }
    });
  });
}

/* ==========================================================================
   7. Follow / Following Synchronized Toggle
   ========================================================================== */
function applyFollowStyle(btn, isFollowing) {
  btn.setAttribute('data-following', isFollowing ? 'true' : 'false');
  btn.textContent = isFollowing ? 'Following' : 'Follow';

  btn.classList.remove(
    'bg-black', 'text-white', 'hover:bg-gray-800',
    'dark:bg-white', 'dark:text-black', 'dark:hover:bg-gray-200', 'shadow-sm',
    'border', 'border-gray-400', 'dark:border-gray-500', 'text-gray-700', 'dark:text-gray-300', 'text-gray-800', 'dark:text-gray-200',
    'hover:border-red-500', 'hover:text-red-500', 'bg-transparent',
    'text-medium-green', 'hover:text-medium-green-hover', 'bg-medium-green', 'hover:bg-medium-green-hover'
  );

  if (isFollowing) {
    btn.classList.add(
      'border', 'border-gray-400', 'dark:border-gray-500',
      'text-gray-700', 'dark:text-gray-300',
      'bg-transparent', 'hover:border-red-500', 'hover:text-red-500'
    );
  } else {
    btn.classList.add(
      'bg-black', 'text-white', 'hover:bg-gray-800',
      'dark:bg-white', 'dark:text-black', 'dark:hover:bg-gray-200', 'shadow-sm'
    );
  }
}

function syncAllFollowButtons(userId, isFollowing) {
  if (!userId) return;
  const selector = `[data-action="follow"][data-user-id="${userId}"], [data-action="toggle-follow"][data-user-id="${userId}"]`;
  document.querySelectorAll(selector).forEach(btn => {
    applyFollowStyle(btn, isFollowing);
  });
}

function initFollowButtons() {
  document.querySelectorAll('[data-action="follow"], [data-action="toggle-follow"]').forEach(btn => {
    if (btn.dataset.followInitialized === 'true') return;
    btn.dataset.followInitialized = 'true';

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const userId = btn.getAttribute('data-user-id');
      if (!userId) return;

      const isFollowing = btn.getAttribute('data-following') === 'true' || btn.textContent.trim().toLowerCase() === 'following';
      const newFollowing = !isFollowing;
      const authorName = btn.getAttribute('data-author') || 'Author';

      // 1. Sahifadagi ushbu muallifning BARCHA follow tugmalarini bir zumda sinxron yangilash (Optimistic UI)
      syncAllFollowButtons(userId, newFollowing);

      const countEl = document.getElementById('follower-count-display');
      const authorFollowerEl = document.getElementById('author-followers-count');

      if (newFollowing) {
        showToast(`You are now following ${authorName}`);
      } else {
        showToast(`Unfollowed ${authorName}`);
      }

      // 2. Serverga xavfsiz so'rov yuborish
      fetch(`/api/user/${userId}/follow/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'Content-Type': 'application/json'
        }
      })
      .then(res => {
        if (res.status === 401) {
          syncAllFollowButtons(userId, isFollowing);
          if (typeof openAuthModal === 'function') {
            openAuthModal('signin');
          } else {
            window.location.href = '/login/';
          }
          return null;
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        if (data.success) {
          syncAllFollowButtons(userId, data.is_following);
          if (countEl) {
            countEl.textContent = `${data.follower_count} follower${data.follower_count === 1 ? '' : 's'}`;
          }
          if (authorFollowerEl) {
            authorFollowerEl.textContent = data.follower_count;
          }
        } else {
          syncAllFollowButtons(userId, isFollowing);
          if (data.error) showToast(data.error);
        }
      })
      .catch(err => {
        console.error('Follow error:', err);
        syncAllFollowButtons(userId, isFollowing);
      });
    });
  });
}

/* ==========================================================================
   8. Sliding Responses Drawer
   ========================================================================== */
function initResponsesDrawer() {
  const drawer = document.getElementById('responses-drawer');
  const backdrop = document.getElementById('responses-backdrop');
  const closeBtn = document.getElementById('close-responses-btn');
  const responseInput = document.getElementById('response-input');
  const postBtn = document.getElementById('post-response-btn');
  const cancelBtn = document.getElementById('cancel-response-btn');
  const responsesList = document.getElementById('responses-list');
  const responseCountHeader = document.getElementById('responses-count-header');

  const openDrawer = () => {
    if (drawer && backdrop) {
      drawer.classList.remove('translate-x-full');
      drawer.classList.add('translate-x-0');
      backdrop.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
      setTimeout(() => {
        if (responseInput) responseInput.focus();
      }, 300);
    }
  };

  const closeDrawer = () => {
    if (drawer && backdrop) {
      drawer.classList.remove('translate-x-0');
      drawer.classList.add('translate-x-full');
      backdrop.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  };

  // Event delegation so all comment buttons trigger the drawer reliably
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="open-responses"], [data-action="toggle-responses"]');
    if (btn) {
      e.preventDefault();
      if (drawer && backdrop) {
        openDrawer();
      } else {
        window.location.href = 'story.html#responses';
      }
    }
  });

  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && !drawer.classList.contains('translate-x-full')) {
      closeDrawer();
    }
  });

  if (responseInput && postBtn) {
    responseInput.addEventListener('input', () => {
      if (responseInput.value.trim().length > 0) {
        postBtn.disabled = false;
        postBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        postBtn.classList.add('hover:bg-medium-green-hover');
      } else {
        postBtn.disabled = true;
        postBtn.classList.add('opacity-50', 'cursor-not-allowed');
        postBtn.classList.remove('hover:bg-medium-green-hover');
      }
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        responseInput.value = '';
        postBtn.disabled = true;
        postBtn.classList.add('opacity-50', 'cursor-not-allowed');
      });
    }

    postBtn.addEventListener('click', () => {
      const text = responseInput.value.trim();
      if (!text || !responsesList) return;

      const newResponse = document.createElement('div');
      newResponse.className = 'border-b border-gray-100 dark:border-[#2a2a2a] pb-4 mb-4 transition-all duration-300';
      newResponse.innerHTML = `
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop" class="w-8 h-8 rounded-full object-cover" alt="You">
            <div>
              <p class="text-sm font-semibold dark:text-white">Abdurakhmon</p>
              <p class="text-xs text-gray-500">Just now</p>
            </div>
          </div>
        </div>
        <p class="text-sm text-gray-800 dark:text-gray-200 mb-3 whitespace-pre-wrap">${escapeHtml(text)}</p>
        <div class="flex items-center justify-between text-xs text-gray-500">
          <button class="flex items-center space-x-1 hover:text-black dark:hover:text-white" data-action="clap">
            <svg class="w-4 h-4 transition-transform fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M10.702 5.25c-.166 0-.32.09-.402.234l-3.346 5.873a4.25 4.25 0 0 0-.531 2.568l.353 3.213a1.236 1.236 0 0 0 1.083 1.093l2.117.252a9.567 9.567 0 0 0 4.15-.422c.66-.22 1.188-.72 1.442-1.367l1.704-4.33a1.42 1.42 0 0 0-1.565-1.92l-3.416.593a1.562 1.562 0 0 1-1.8-1.84l.665-3.395a.463.463 0 0 0-.454-.552Zm-1.705-.509a1.963 1.963 0 0 1 3.631 1.349l-.665 3.396a.056.056 0 0 0 0 .03a.065.065 0 0 0 .017.025a.066.066 0 0 0 .025.017a.057.057 0 0 0 .03.001l3.415-.593a2.92 2.92 0 0 1 3.218 3.947l-1.704 4.33a3.846 3.846 0 0 1-2.365 2.241c-1.545.514-3.184.68-4.8.488l-2.117-.251a2.736 2.736 0 0 1-2.397-2.419l-.353-3.213a5.75 5.75 0 0 1 .72-3.475l3.345-5.873Z" clip-rule="evenodd"/></svg>
            <span class="clap-count">0</span>
          </button>
          <button class="hover:text-black dark:hover:text-white">Reply</button>
        </div>
      `;

      responsesList.prepend(newResponse);
      responseInput.value = '';
      postBtn.disabled = true;
      postBtn.classList.add('opacity-50', 'cursor-not-allowed');

      // Update count
      if (responseCountHeader) {
        const match = responseCountHeader.textContent.match(/\d+/);
        const nextCount = match ? parseInt(match[0]) + 1 : 1;
        responseCountHeader.textContent = `Responses (${nextCount})`;
        document.querySelectorAll('[data-action="open-responses"] span, .responses-badge-count').forEach(el => {
          el.textContent = nextCount;
        });
      }

      // Attach clap listener to newly created item
      const newClap = newResponse.querySelector('[data-action="clap"]');
      if (newClap) {
        attachClapListener(newClap);
      }

      const storyContainer = document.querySelector('[data-post-id]');
      const postId = storyContainer ? storyContainer.dataset.postId : null;

      if (postId) {
        fetch(`/api/posts/${postId}/comment/`, {
          method: 'POST',
          headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: text })
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            if (responseCountHeader) {
              responseCountHeader.textContent = `Responses (${data.comments_count})`;
            }
            document.querySelectorAll('[data-action="open-responses"] span, .responses-badge-count').forEach(el => {
              el.textContent = data.comments_count;
            });
          }
        })
        .catch(err => console.log('Comment error:', err));
      }

      showToast('Response published');
    });
  }

  // ==========================================================================
  // Interactive Reply to Comments Feature
  // ==========================================================================
  document.addEventListener('click', (e) => {
    const replyBtn = e.target.closest('[data-action="reply"], button.hover\\:underline, button.hover\\:text-black');
    if (!replyBtn) return;
    if (replyBtn.textContent.trim().toLowerCase() !== 'reply') return;
    e.preventDefault();

    const responseCard = replyBtn.closest('.response-card, .border-b');
    if (!responseCard) return;

    // Check if reply box already exists in this card
    const existingBox = responseCard.querySelector('.inline-reply-box');
    if (existingBox) {
      const textarea = existingBox.querySelector('.reply-textarea');
      if (textarea) textarea.focus();
      return;
    }

    // Determine author being replied to
    const authorEl = responseCard.querySelector('.response-author, p.font-semibold');
    const authorName = authorEl ? authorEl.textContent.trim() : 'Author';

    const replyBox = document.createElement('div');
    replyBox.className = 'inline-reply-box mt-3 p-3.5 rounded-xl border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#202020] space-y-2.5 transition-all';
    replyBox.innerHTML = `
      <div class="flex items-center space-x-2">
        <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop" class="w-6 h-6 rounded-full object-cover" alt="You">
        <span class="text-xs font-semibold text-gray-700 dark:text-gray-300">Replying to <span class="text-medium-green font-bold">@${escapeHtml(authorName)}</span></span>
      </div>
      <textarea 
        rows="2" 
        placeholder="Write a reply..." 
        class="reply-textarea w-full bg-transparent text-sm resize-none focus:outline-none placeholder-gray-400 dark:text-white"
      ></textarea>
      <div class="flex items-center justify-end space-x-2 pt-1 border-t border-gray-100 dark:border-[#2a2a2a]">
        <button type="button" class="cancel-reply-btn text-xs text-gray-500 hover:text-black dark:hover:text-white px-2.5 py-1">Cancel</button>
        <button type="button" disabled class="submit-reply-btn bg-medium-green text-white text-xs font-medium px-3.5 py-1 rounded-full opacity-50 cursor-not-allowed transition-all">Reply</button>
      </div>
    `;

    // Find or create thread container
    let thread = responseCard.querySelector('.replies-thread');
    if (!thread) {
      thread = document.createElement('div');
      thread.className = 'replies-thread space-y-3 mt-3';
      responseCard.appendChild(thread);
    }
    responseCard.insertBefore(replyBox, thread);

    const replyTextarea = replyBox.querySelector('.reply-textarea');
    const submitBtn = replyBox.querySelector('.submit-reply-btn');
    const cancelBtn = replyBox.querySelector('.cancel-reply-btn');

    if (replyTextarea) {
      replyTextarea.focus();
      replyTextarea.addEventListener('input', () => {
        if (replyTextarea.value.trim().length > 0) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          submitBtn.classList.add('hover:bg-medium-green-hover');
        } else {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
          submitBtn.classList.remove('hover:bg-medium-green-hover');
        }
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        replyBox.remove();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const text = replyTextarea.value.trim();
        if (!text) return;

        const newNestedReply = document.createElement('div');
        newNestedReply.className = 'nested-reply pl-3 border-l-2 border-medium-green/60 dark:border-medium-green/40 mt-3 pt-2 space-y-1.5 transition-all';
        newNestedReply.innerHTML = `
          <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=64&h=64&fit=crop" class="w-6 h-6 rounded-full object-cover" alt="You">
              <div>
                <p class="text-xs font-semibold text-gray-900 dark:text-white">Abdurakhmon</p>
                <p class="text-[11px] text-gray-400">Just now</p>
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">${escapeHtml(text)}</p>
          <div class="flex items-center space-x-3 text-xs text-gray-500 pt-1">
            <button type="button" data-action="clap" class="flex items-center space-x-1 hover:text-black dark:hover:text-white">
              <svg class="w-3.5 h-3.5 transition-transform fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="M10.702 5.25c-.166 0-.32.09-.402.234l-3.346 5.873a4.25 4.25 0 0 0-.531 2.568l.353 3.213a1.236 1.236 0 0 0 1.083 1.093l2.117.252a9.567 9.567 0 0 0 4.15-.422c.66-.22 1.188-.72 1.442-1.367l1.704-4.33a1.42 1.42 0 0 0-1.565-1.92l-3.416.593a1.562 1.562 0 0 1-1.8-1.84l.665-3.395a.463.463 0 0 0-.454-.552Zm-1.705-.509a1.963 1.963 0 0 1 3.631 1.349l-.665 3.396a.056.056 0 0 0 0 .03a.065.065 0 0 0 .017.025a.066.066 0 0 0 .025.017a.057.057 0 0 0 .03.001l3.415-.593a2.92 2.92 0 0 1 3.218 3.947l-1.704 4.33a3.846 3.846 0 0 1-2.365 2.241c-1.545.514-3.184.68-4.8.488l-2.117-.251a2.736 2.736 0 0 1-2.397-2.419l-.353-3.213a5.75 5.75 0 0 1 .72-3.475l3.345-5.873Z" clip-rule="evenodd"/></svg>
              <span class="clap-count">0</span>
            </button>
            <button type="button" data-action="reply" class="hover:underline text-gray-600 dark:text-gray-400 font-medium">Reply</button>
          </div>
        `;

        thread.appendChild(newNestedReply);

        const newClap = newNestedReply.querySelector('[data-action="clap"]');
        if (newClap) {
          attachClapListener(newClap);
        }

        replyBox.remove();

        // Increment total responses count
        if (responseCountHeader) {
          const match = responseCountHeader.textContent.match(/\d+/);
          const nextCount = match ? parseInt(match[0]) + 1 : 1;
          responseCountHeader.textContent = `Responses (${nextCount})`;
          document.querySelectorAll('[data-action="open-responses"] span, .responses-badge-count').forEach(el => {
            el.textContent = nextCount;
          });
        }

        showToast(`Replied to ${authorName}`);
      });
    }
  });

  // Open drawer automatically if hash is #responses
  if (window.location.hash === '#responses') {
    // If skeleton is running, immediately reveal story
    const storySkeleton = document.getElementById('story-skeleton');
    const storyContent = document.getElementById('story-content');
    if (storySkeleton && storyContent) {
      storySkeleton.classList.add('hidden');
      storyContent.classList.remove('hidden');
      storyContent.style.opacity = '1';
    }
    setTimeout(openDrawer, 150);
  }
}

/* ==========================================================================
   9. Reading Progress Bar (for story.html)
   ========================================================================== */
function initReadingProgressBar() {
  const progressBar = document.getElementById('reading-progress-bar');
  if (!progressBar) return;

  const updateProgress = () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return;
    const progress = (window.scrollY / totalHeight) * 100;
    progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

/* ==========================================================================
   10. Audio Story Reader (Web Speech API + Custom Player)
   ========================================================================== */
function initAudioListen() {
  const listenBtn = document.getElementById('listen-btn');
  const audioWidget = document.getElementById('audio-widget');
  const audioPlayIcon = document.getElementById('audio-play-icon');
  const audioPauseIcon = document.getElementById('audio-pause-icon');
  const playToggleBtn = document.getElementById('audio-toggle-play-btn');
  const speedBtn = document.getElementById('audio-speed-btn');
  const closeBtn = document.getElementById('audio-close-btn');
  const audioProgress = document.getElementById('audio-progress');
  const timeDisplay = document.getElementById('audio-time-display');

  if (!listenBtn || !audioWidget) return;

  let isPlaying = false;
  let interval = null;
  let currentSec = 0;
  let totalSec = 180;
  const speeds = [1, 1.25, 1.5, 2];
  let speedIndex = 0;
  let utterance = null;

  // Calculate duration based on story text word count
  const storyBody = document.querySelector('.medium-story-body');
  const rawText = storyBody ? storyBody.innerText.trim() : '';
  const wordCount = rawText ? rawText.split(/\s+/).length : 200;
  totalSec = Math.max(30, Math.round((wordCount / 140) * 60));

  function updateUI(playing) {
    isPlaying = playing;
    if (audioPlayIcon && audioPauseIcon) {
      if (playing) {
        audioPlayIcon.classList.add('hidden');
        audioPauseIcon.classList.remove('hidden');
      } else {
        audioPlayIcon.classList.remove('hidden');
        audioPauseIcon.classList.add('hidden');
      }
    }
  }

  function startSpeech() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    if (!rawText) return;
    utterance = new SpeechSynthesisUtterance(rawText);
    utterance.rate = speeds[speedIndex];

    utterance.onend = () => {
      stopAudio();
    };

    utterance.onerror = () => {
      stopAudio();
    };

    window.speechSynthesis.speak(utterance);
  }

  function togglePlay() {
    if (!isPlaying) {
      updateUI(true);
      if (window.speechSynthesis) {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        } else {
          startSpeech();
        }
      }
      clearInterval(interval);
      interval = setInterval(() => {
        currentSec++;
        if (audioProgress) {
          audioProgress.style.width = `${Math.min(100, (currentSec / totalSec) * 100)}%`;
        }
        if (timeDisplay) {
          timeDisplay.textContent = formatTime(currentSec) + ' / ' + formatTime(totalSec);
        }
        if (currentSec >= totalSec) {
          stopAudio();
        }
      }, 1000 / speeds[speedIndex]);
    } else {
      updateUI(false);
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
      clearInterval(interval);
    }
  }

  function stopAudio() {
    updateUI(false);
    clearInterval(interval);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  listenBtn.addEventListener('click', () => {
    audioWidget.classList.remove('hidden');
    audioWidget.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    if (!isPlaying) {
      togglePlay();
    }
  });

  if (playToggleBtn) {
    playToggleBtn.addEventListener('click', togglePlay);
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      stopAudio();
      audioWidget.classList.add('hidden');
      currentSec = 0;
      if (audioProgress) audioProgress.style.width = '0%';
      if (timeDisplay) timeDisplay.textContent = '0:00 / ' + formatTime(totalSec);
    });
  }

  if (speedBtn) {
    speedBtn.addEventListener('click', () => {
      speedIndex = (speedIndex + 1) % speeds.length;
      speedBtn.textContent = speeds[speedIndex] + 'x';
      if (isPlaying) {
        startSpeech();
      }
    });
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/* ==========================================================================
   11. Share Actions & Copy Link
   ========================================================================== */
function initShareActions() {
  document.querySelectorAll('[data-action="copy-link"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const url = btn.getAttribute('data-url') || window.location.href;
      navigator.clipboard.writeText(url).then(() => {
        showToast('Story link copied to clipboard');
      }).catch(() => {
        showToast('Copied link: ' + url);
      });
    });
  });

  // Copy Code Action (macOS Carbon Code Card)
  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-action="copy-code"]');
    if (!copyBtn) return;
    e.preventDefault();
    const container = copyBtn.closest('.carbon-code-window') || copyBtn.closest('pre');
    const codeEl = container ? (container.querySelector('code') || container) : null;
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.innerText.trim()).then(() => {
        showToast('Code copied to clipboard');
      }).catch(() => {
        showToast('Code copied');
      });
    }
  });
}

/* ==========================================================================
   12. Tabs Navigation (Generic for feed, profile, search, lists)
   ========================================================================== */
function initTabs() {
  document.querySelectorAll('[data-tabs-group]').forEach(group => {
    const groupId = group.getAttribute('data-tabs-group');
    const tabs = group.querySelectorAll('[data-tab-target]');

    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = tab.getAttribute('data-tab-target');

        // Reset all tabs in this group
        tabs.forEach(t => {
          t.classList.remove('border-black', 'border-medium-dark', 'dark:border-white', 'text-black', 'text-medium-dark', 'dark:text-white', 'font-semibold', 'font-bold');
          t.classList.add('border-transparent', 'text-gray-500', 'hover:text-black', 'dark:hover:text-white');
        });

        // Activate clicked tab
        tab.classList.remove('border-transparent', 'text-gray-500');
        tab.classList.add('border-black', 'dark:border-white', 'text-black', 'dark:text-white', 'font-semibold');

        // Toggle panels with smooth fade animation
        document.querySelectorAll(`[data-tab-panel-group="${groupId}"]`).forEach(panel => {
          if (panel.id === targetId) {
            panel.classList.remove('hidden');
            panel.classList.remove('page-enter');
            void panel.offsetWidth; // trigger reflow
            panel.classList.add('page-enter');
          } else {
            panel.classList.add('hidden');
            panel.classList.remove('page-enter');
          }
        });
      });
    });
  });

  // Activate tab from URL hash if present (e.g. #stories, #tab-stories, #about)
  if (window.location.hash) {
    const cleanHash = window.location.hash.replace('#', '');
    const matchingTab = document.querySelector(`[data-tab-target="${cleanHash}"]`) ||
                        document.querySelector(`[data-tab-target="tab-${cleanHash}"]`);
    if (matchingTab) {
      setTimeout(() => matchingTab.click(), 50);
    }
  }

  // Handle switch to Books tab from Featured Book "See all (2)"
  document.querySelectorAll('[data-action="switch-tab-books"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const booksTab = document.querySelector('[data-tab-target="tab-books"]');
      if (booksTab) booksTab.click();
    });
  });
}

/* ==========================================================================
   13. Toast Notification Engine
   ========================================================================== */
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2 pointer-events-none';
    document.body.appendChild(container);
  }
}

function showToast(message) {
  initToastContainer();
  const container = document.getElementById('toast-container');
  if (!container) return;

  // Clear previous toasts so they never stack on the user's screen!
  container.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = 'bg-[#191919] text-white dark:bg-[#2a2a2a] dark:text-white text-xs sm:text-sm px-4 py-2 rounded-full shadow-xl flex items-center space-x-2 transition-all duration-200 transform translate-y-2 opacity-0 pointer-events-auto border border-gray-700/50';
  toast.innerHTML = `
    <span class="w-2 h-2 rounded-full bg-medium-green shrink-0"></span>
    <span class="font-medium">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 1600);
}

function escapeHtml(string) {
  const div = document.createElement('div');
  div.innerText = string;
  return div.innerHTML;
}

// Make showToast globally accessible
window.showToast = showToast;

/* ==========================================================================
   14. Modern Medium Sidebar Toggle (Mobile Drawer & Desktop Collapse)
   ========================================================================== */
function initSidebarToggle() {
  const toggleBtns = document.querySelectorAll('#sidebar-toggle-btn, [data-action="toggle-sidebar"]');
  const leftSidebar = document.getElementById('left-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  if (!leftSidebar) return;

  const toggle = () => {
    // Check if on mobile/small screen (< 1024px)
    if (window.innerWidth < 1024) {
      leftSidebar.style.width = '';
      leftSidebar.querySelectorAll('.nav-label, .sidebar-brand-logo, .sidebar-logo, .following-section').forEach(el => el.classList.remove('hidden'));
      leftSidebar.classList.remove('desktop-collapsed');

      const isClosed = leftSidebar.classList.contains('-translate-x-full');
      if (isClosed) {
        leftSidebar.classList.remove('-translate-x-full');
        if (backdrop) backdrop.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
      } else {
        leftSidebar.classList.add('-translate-x-full');
        if (backdrop) backdrop.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    } else {
      // Desktop: collapse / expand sidebar width
      leftSidebar.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');

      leftSidebar.classList.toggle('desktop-collapsed');
      if (leftSidebar.classList.contains('desktop-collapsed')) {
        leftSidebar.style.width = '72px';
        leftSidebar.querySelectorAll('.nav-label, .sidebar-brand-logo, .sidebar-logo, .following-section').forEach(el => el.classList.add('hidden'));
      } else {
        leftSidebar.style.width = '240px';
        leftSidebar.querySelectorAll('.nav-label, .sidebar-brand-logo, .sidebar-logo, .following-section').forEach(el => el.classList.remove('hidden'));
      }
    }
  };

  toggleBtns.forEach(btn => btn.addEventListener('click', toggle));

  if (backdrop) {
    backdrop.addEventListener('click', () => {
      leftSidebar.classList.add('-translate-x-full');
      backdrop.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    });
  }

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      leftSidebar.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    } else {
      if (!leftSidebar.classList.contains('desktop-collapsed')) {
        leftSidebar.style.width = '';
        leftSidebar.querySelectorAll('.nav-label, .sidebar-brand-logo, .sidebar-logo, .following-section').forEach(el => el.classList.remove('hidden'));
      }
    }
  });
}

/* ==========================================================================
   15. Topic Pills Toggle (+ to ✓)
   ========================================================================== */
function initTopicPills() {
  document.querySelectorAll('[data-action="toggle-topic"]').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.preventDefault();
      const topicName = pill.getAttribute('data-topic') || pill.textContent.replace(/[+✓]/g, '').trim();
      const isFollowed = pill.getAttribute('data-followed') === 'true';

      if (isFollowed) {
        pill.setAttribute('data-followed', 'false');
        pill.classList.remove('active', 'bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
        pill.classList.add('bg-[#f2f2f2]', 'dark:bg-[#202020]', 'text-gray-800', 'dark:text-gray-200');
        const icon = pill.querySelector('.pill-icon');
        if (icon) icon.textContent = '+';
        showToast(`Removed ${topicName} from your topics`);
      } else {
        pill.setAttribute('data-followed', 'true');
        pill.classList.add('active', 'bg-black', 'text-white', 'dark:bg-white', 'dark:text-black');
        pill.classList.remove('bg-[#f2f2f2]', 'dark:bg-[#202020]', 'text-gray-800', 'dark:text-gray-200');
        const icon = pill.querySelector('.pill-icon');
        if (icon) icon.textContent = '✓';
        showToast(`Added ${topicName} to your topics`);
      }
    });
  });
}

/* ==========================================================================
   16. Reposts Toggle
   ========================================================================== */
function initReposts() {
  document.querySelectorAll('[data-action="repost"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isReposted = btn.getAttribute('data-reposted') === 'true';
      const countEl = btn.querySelector('.repost-count');
      let count = countEl ? parseCount(countEl.textContent) : 0;

      if (isReposted) {
        btn.setAttribute('data-reposted', 'false');
        btn.classList.remove('text-medium-green');
        if (countEl && count > 0) countEl.textContent = formatCount(count - 1);
        showToast('Story removed from your profile reposts');
      } else {
        btn.setAttribute('data-reposted', 'true');
        btn.classList.add('text-medium-green');
        if (countEl) countEl.textContent = formatCount(count + 1);
        showToast('Story reposted to your profile');
      }
    });
  });
}

/* ==========================================================================
   17. Less Like This (Thumbs Down / Hide Story)
   ========================================================================== */
function initLessLikeThis() {
  document.querySelectorAll('[data-action="less-like-this"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const article = btn.closest('article');
      if (article) {
        article.classList.add('opacity-40', 'transition-opacity');
        showToast("We'll show less stories like this in your feed");
      }
    });
  });
}

/* ==========================================================================
   18. Story 3-Dots Menu Actions
   ========================================================================== */
function initStoryMenuActions() {
  document.querySelectorAll('[data-action="mute-author"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const author = btn.getAttribute('data-author') || 'this author';
      showToast(`Muted stories by ${author}`);
      const menu = btn.closest('.dropdown-menu');
      if (menu) menu.classList.add('hidden');
    });
  });

  document.querySelectorAll('[data-action="report-story"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Thank you. We will review this story.');
      const menu = btn.closest('.dropdown-menu');
      if (menu) menu.classList.add('hidden');
    });
  });
}



/* ==========================================================================
   22. Active Navigation Highlighting
       Reads body[data-nav-page] attribute OR current filename to mark
       the correct sidebar link as active. Works for both static files
       (file:// protocol) and Django served URLs.
   ========================================================================== */
function initActiveNav() {
  // Determine current page from body attribute or URL path
  const navPage = document.body.dataset.navPage;
  
  // Also detect from URL filename for static file serving
  const path = window.location.pathname;
  const filename = path.split('/').pop().replace('.html', '');

  // Map filenames/nav-page values to nav link identifiers
  const pageMap = {
    'feed':          'home',
    'home':          'home',
    '':              'home',
    'lists':         'library',
    'library':       'library',
    'profile':       'profile',
    'stats':         'stats',
    'write':         'write',
    'settings':      'settings',
    'notifications': 'notifications',
    'search':        'search',
    'story':         'home',   // story page highlights Home
  };

  const activePage = navPage || pageMap[filename] || pageMap[filename.toLowerCase()] || 'home';

  // Apply active class to matching nav links
  document.querySelectorAll('[data-nav-link]').forEach(link => {
    const linkPage = link.dataset.navLink;
    if (linkPage === activePage) {
      link.classList.add('active');
      // Show filled icons, hide outline icons
      const activeIcon  = link.querySelector('.nav-icon-active');
      const inactiveIcon = link.querySelector('.nav-icon-inactive');
      if (activeIcon)  activeIcon.classList.remove('hidden');
      if (inactiveIcon) inactiveIcon.classList.add('hidden');
    } else {
      link.classList.remove('active');
      const activeIcon  = link.querySelector('.nav-icon-active');
      const inactiveIcon = link.querySelector('.nav-icon-inactive');
      if (activeIcon)  activeIcon.classList.add('hidden');
      if (inactiveIcon) inactiveIcon.classList.remove('hidden');
    }
  });

  // Also handle old-style hardcoded active class (pages not yet migrated)
  // This ensures backward compatibility during transition
}


/* ==========================================================================
   23. Clickable Article Cards
       Makes entire [data-clickable-card] elements navigable without
       breaking inner button/link clicks (clap, bookmark, dropdown, etc.)
   ========================================================================== */
function initClickableCards() {
  document.querySelectorAll('[data-clickable-card]').forEach(card => {
    if (card.dataset.clickableCardBound) return;
    card.dataset.clickableCardBound = 'true';

    card.addEventListener('click', (e) => {
      // Don't navigate if user clicked a button, link, or interactive element
      if (e.target.closest('button, a, [data-action], .dropdown-menu, textarea, input')) return;

      const href = card.dataset.href;
      if (!href) return;

      // Use page transition if available
      if (document.body.style !== undefined) {
        document.body.style.transition = 'opacity 0.18s ease-out';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = href; }, 180);
      } else {
        window.location.href = href;
      }
    });
  });
}
/* ==========================================================================
   20. Page Transitions & Global Top Progress Bar
   ========================================================================== */
function initPageTransitions() {
  // Ensure top progress bar exists
  let progressBar = document.getElementById('global-page-progress');
  if (!progressBar) {
    progressBar = document.createElement('div');
    progressBar.id = 'global-page-progress';
    document.body.prepend(progressBar);
  }

  // Animate page entrance progress bar
  progressBar.style.opacity = '1';
  progressBar.style.width = '0%';
  document.body.classList.remove('page-exit');
  document.body.classList.add('page-enter');

  requestAnimationFrame(() => {
    progressBar.style.width = '60%';
    setTimeout(() => {
      progressBar.style.width = '100%';
      setTimeout(() => {
        progressBar.style.opacity = '0';
        setTimeout(() => {
          progressBar.style.width = '0%';
        }, 500);
      }, 450);
    }, 650);
  });

  // Internal page navigation with progress bar and card clicks
  document.addEventListener('click', (e) => {
    // 1. Check if clicking on a clickable card
    const card = e.target.closest('[data-clickable-card]');
    if (card && !e.target.closest('button, a, input, [data-action], [data-dropdown-toggle]')) {
      const cardHref = card.getAttribute('data-href');
      if (cardHref) {
        if (progressBar) {
          progressBar.style.opacity = '1';
          progressBar.style.width = '70%';
        }
        window.location.href = cardHref;
        return;
      }
    }

    // 2. Standard link clicks
    const link = e.target.closest('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Ignore anchors, javascript, external links, or blank targets
    if (
      link.target === '_blank' ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.hasAttribute('download') ||
      link.dataset.noTransition !== undefined ||
      e.ctrlKey || e.metaKey || e.shiftKey || e.altKey
    ) {
      return;
    }

    const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
    if (isExternal) return;

    // For internal HTML pages: start progress bar without blocking native browser navigation!
    if (href.endsWith('.html') || href.includes('.html?') || href.includes('.html#')) {
      if (progressBar) {
        progressBar.style.opacity = '1';
        progressBar.style.width = '75%';
      }
      document.body.classList.remove('page-enter');
      document.body.classList.add('page-exit');
    }
  });

  // Handle bfcache / back-forward navigation
  window.addEventListener('pageshow', (event) => {
    document.body.classList.remove('page-exit');
    document.body.classList.add('page-enter');
    if (progressBar) {
      progressBar.style.opacity = '0';
      progressBar.style.width = '0%';
    }
  });
}

/* ==========================================================================
   21. Medium Skeleton Shimmer Loader (Exact match to Medium.com)
   ========================================================================== */
function initSkeletonLoaders() {
  const storySkeleton = document.getElementById('story-skeleton');
  const storyContent = document.getElementById('story-content');

  if (storySkeleton && storyContent) {
    // Show skeleton shimmer for full comfortable duration (2.2s) so user can admire the animation
    setTimeout(() => {
      storySkeleton.style.transition = 'opacity 0.5s ease-out';
      storySkeleton.style.opacity = '0';

      setTimeout(() => {
        storySkeleton.classList.add('hidden');
        storyContent.classList.remove('hidden');
        storyContent.style.opacity = '0';
        storyContent.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        requestAnimationFrame(() => {
          storyContent.style.opacity = '1';
        });
      }, 500);
    }, 2200);
  }

  // Feed Tab Shimmer Effect on Tab Switches
  const feedTabs = document.querySelectorAll('[data-tabs-group="feed-tabs"] [data-tab-target]');
  const feedSkeleton = document.getElementById('feed-tab-skeleton');
  const feedArticles = document.getElementById('feed-articles-container');

  if (feedTabs.length > 0 && feedSkeleton && feedArticles) {
    feedTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        feedSkeleton.classList.remove('hidden');
        feedSkeleton.style.opacity = '1';
        feedArticles.classList.add('hidden');

        setTimeout(() => {
          feedSkeleton.style.transition = 'opacity 0.18s ease';
          feedSkeleton.style.opacity = '0';
          setTimeout(() => {
            feedSkeleton.classList.add('hidden');
            feedArticles.classList.remove('hidden');
            feedArticles.style.opacity = '0';
            feedArticles.style.transition = 'opacity 0.25s ease';
            requestAnimationFrame(() => {
              feedArticles.style.opacity = '1';
            });
          }, 180);
        }, 220);
      });
    });
  }
}

/* ==========================================================================
   20. Global Button & Action Handlers (All pages)
   ========================================================================== */
function initGlobalActions() {
  // 1. Delegated handler for all [data-coming-soon]
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-coming-soon]');
    if (!el) return;
    e.preventDefault();
    const label = el.dataset.comingSoon || el.textContent.trim();
    showToast(label);
  });

  // 2. Forgot password handler
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action="forgot-password"]');
    if (!el) return;
    e.preventDefault();
    const email = prompt('Enter your registered email address for password recovery:');
    if (email && email.trim()) {
      showToast(`Password reset link sent to ${email.trim()}`);
    } else if (email !== null) {
      showToast('Please enter a valid email address');
    }
  });

  // 3. Edit story license in settings
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action="edit-license"]');
    if (!el) return;
    e.preventDefault();
    const licenseDisplay = document.getElementById('current-story-license');
    if (licenseDisplay) {
      const isAllRights = licenseDisplay.textContent.includes('All Rights');
      const nextLicense = isAllRights ? 'Creative Commons Attribution-NonCommercial 4.0' : 'All Rights Reserved';
      licenseDisplay.textContent = nextLicense;
      showToast(`Story license updated: ${nextLicense}`);
    }
  });

  // 4. Upgrade membership
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action="upgrade-membership"]');
    if (!el) return;
    e.preventDefault();
    showToast('Redirecting to Medium Membership checkout...');
    setTimeout(() => {
      showToast('Membership preview activated! Unlimited access granted.');
    }, 1200);
  });

  // 5. Notification toggles in settings
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-action="toggle-notification"]');
    if (!el) return;
    const label = el.dataset.label || 'Notification';
    showToast(`${label} ${el.checked ? 'enabled' : 'disabled'}`);
    fetch('/api/user/settings/', {
      method: 'POST',
      headers: {
        'X-CSRFToken': getCookie('csrftoken'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ [label]: el.checked })
    }).catch(err => console.log('Settings error:', err));
  });

  const markAllReadBtn = document.getElementById('mark-all-read-btn');
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', () => {
      fetch('/api/notifications/read/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken')
        }
      }).then(res => res.json()).then(data => {
        if (data.success) {
          document.querySelectorAll('.unread-dot').forEach(dot => dot.remove());
          showToast('All notifications marked as read');
        }
      });
    });
  }

  // 6. Write page notifications bell
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action="write-notifications"]');
    if (!el) return;
    e.preventDefault();
    showToast('You have no unread notifications');
  });

  // 7. Write page customize footer
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action="customize-footer"]');
    if (!el) return;
    e.preventDefault();
    showToast('Custom story footer settings saved');
  });

  // 8. Write page submit to publication
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action="submit-publication"]');
    if (!el) return;
    e.preventDefault();
    showToast('Choose a publication to submit your story');
  });

  // 9. Schedule for later button in publish overlay
  const scheduleBtn = document.getElementById('schedule-later-btn');
  if (scheduleBtn) {
    scheduleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const schedTime = prompt('Schedule publish date & time (e.g. Tomorrow 9:00 AM):', 'Tomorrow 9:00 AM');
      if (schedTime && schedTime.trim()) {
        showToast(`Story scheduled for ${schedTime.trim()}!`);
        const modal = document.getElementById('publish-modal');
        if (modal) modal.classList.add('hidden');
        setTimeout(() => {
          window.location.href = '/feed/';
        }, 1200);
      }
    });
  }

  // 10. Unfollow suggestion options in profile
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action="unfollow-suggestion"]');
    if (!el) return;
    e.preventDefault();
    const name = el.dataset.name || 'Publication';
    const row = el.closest('.flex');
    if (row) {
      row.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      row.style.opacity = '0';
      row.style.transform = 'translateX(10px)';
      setTimeout(() => row.remove(), 200);
    }
    showToast(`Removed ${name} from suggestions`);
  });

  // 11. Delete story action
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-story"]');
    if (!btn) return;
    e.preventDefault();
    const postId = btn.dataset.postId;
    if (!postId) return;

    if (confirm('Ushbu hikoyani o\'chirib tashlashni xohlaysizmi? Bu amalni ortga qaytarib bo\'lmaydi.')) {
      fetch(`/api/posts/${postId}/delete/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCookie('csrftoken'),
          'Content-Type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          showToast('Hikoya muvaffaqiyatli o\'chirildi');
          setTimeout(() => {
            window.location.href = data.redirect_url || '/feed/';
          }, 600);
        } else {
          showToast(data.error || 'O\'chirishda xatolik yuz berdi', 'error');
        }
      })
      .catch(() => {
        showToast('Server bilan bog\'lanishda xatolik', 'error');
      });
    }
  });
}

/* ==========================================================================
   21. Interactive YouTube Video Cards
   ========================================================================== */
function initYouTubeCards() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.yt-video-card');
    if (!card) return;
    if (e.target.closest('a')) return;
    const videoId = card.getAttribute('data-yt-id');
    if (!videoId) return;

    card.outerHTML = `
      <div class="relative w-full aspect-video rounded-md overflow-hidden bg-black shadow-md">
        <iframe class="absolute inset-0 w-full h-full"
          src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen>
        </iframe>
      </div>
    `;
  });
}

/* ==========================================================================
   22. Password Change Handler
   ========================================================================== */
function initPasswordChange() {
  const form = document.getElementById('change-password-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = document.getElementById('change-password-btn');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (data.new_password !== data.confirm_password) {
      if (window.showToast) showToast('New passwords do not match', 'error');
      else alert('New passwords do not match');
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Updating...';
    }
    if (window.showLoadingAnimation) window.showLoadingAnimation('Updating password...');

    fetch('/api/user/password/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
      },
      body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(result => {
      if (result.success) {
        if (window.showToast) showToast(result.message || 'Password updated successfully!', 'success');
        form.reset();
      } else {
        if (window.showToast) showToast(result.error || 'Failed to update password', 'error');
        else alert(result.error || 'Failed to update password');
      }
    })
    .catch(() => {
      if (window.showToast) showToast('Server error while updating password', 'error');
    })
    .finally(() => {
      if (window.hideLoadingAnimation) window.hideLoadingAnimation();
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Update password';
      }
    });
  });
}

/* ==========================================================================
   23. Story Cards Staggered Scroll Reveal
   ========================================================================== */
function initScrollReveal() {
  const cards = document.querySelectorAll('.medium-story-card, .search-item');
  if (!cards.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.05,
      rootMargin: '0px 0px -25px 0px'
    });

    cards.forEach((card, idx) => {
      card.classList.add('story-card-reveal');
      card.style.transitionDelay = `${Math.min((idx % 8) * 0.045, 0.28)}s`;
      observer.observe(card);
    });
  } else {
    cards.forEach(card => card.classList.add('is-visible'));
  }
}

/* ==========================================================================
   24. Story Reading Progress Bar at Viewport Top
   ========================================================================== */
function initStoryReadingProgress() {
  const storyBody = document.querySelector('.medium-story-body') || document.querySelector('article');
  if (!storyBody) return;

  let bar = document.getElementById('story-reading-progress');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'story-reading-progress';
    document.body.prepend(bar);
  }

  const updateProgress = () => {
    const rect = storyBody.getBoundingClientRect();
    const storyTop = window.scrollY + rect.top;
    const storyHeight = rect.height;
    const viewportHeight = window.innerHeight;
    const scrollPos = window.scrollY;

    if (scrollPos < storyTop) {
      bar.style.width = '0%';
    } else {
      const scrollableDist = Math.max(1, storyHeight - viewportHeight * 0.7);
      const progress = Math.min(100, Math.max(0, ((scrollPos - storyTop) / scrollableDist) * 100));
      bar.style.width = `${progress}%`;
    }
  };

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}
