/**
 * Medium Clone — Page-specific JavaScript
 * All inline onclick handlers and page-level scripts extracted here.
 * This file is loaded on all pages (after main.js).
 *
 * Functions are page-aware: they check for DOM elements before running.
 */

/* ==========================================================================
   SEARCH PAGE — Live search filtering & URL query reading
   ========================================================================== */
(function initSearchPage() {
  const searchInput  = document.getElementById('live-search-input');
  if (!searchInput) return; // not on search page

  const searchHeading = document.getElementById('search-heading');
  const noResultsEl  = document.getElementById('no-search-results');

  /** Set search input value and filter results */
  window.setSearchTerm = function(term) {
    searchInput.value = term;
    filterStories();
  };

  function filterStories() {
    const q     = searchInput.value.toLowerCase().trim();
    const items = document.querySelectorAll('.search-item');
    let visibleCount = 0;

    if (searchHeading) {
      searchHeading.textContent = q
        ? `Results for "${searchInput.value.trim()}"`
        : 'Explore stories & topics';
    }

    items.forEach(item => {
      const title = item.querySelector('.search-title')?.textContent.toLowerCase()  || '';
      const snip  = item.querySelector('.search-snippet')?.textContent.toLowerCase() || '';
      const show  = !q || title.includes(q) || snip.includes(q);
      item.style.display = show ? 'block' : 'none';
      if (show) visibleCount++;
    });

    if (noResultsEl) {
      noResultsEl.classList.toggle('hidden', !(visibleCount === 0 && q));
    }
  }

  searchInput.addEventListener('input', filterStories);

  // Handle data-search-term pill buttons (replaces onclick="setSearchTerm('...')")
  document.querySelectorAll('[data-search-term]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.setSearchTerm(btn.dataset.searchTerm);
    });
  });

  // Read ?q= or ?topic= from URL on page load
  const params = new URLSearchParams(window.location.search);
  const query  = params.get('q') || params.get('topic');
  if (query) {
    searchInput.value = query;
    filterStories();
  }
})();


/* ==========================================================================
   NOTIFICATIONS PAGE — Mark all as read
   ========================================================================== */
(function initNotificationsPage() {
  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (!markAllBtn) return;

  markAllBtn.addEventListener('click', () => {
    document.querySelectorAll('.unread-dot').forEach(dot => dot.remove());
    if (typeof showToast === 'function') showToast('All marked as read');
  });
})();


/* ==========================================================================
   LISTS PAGE — Library promo banner, list actions
   ========================================================================== */
(function initListsPage() {
  // Dismiss promo banner
  const dismissBtn = document.getElementById('dismiss-library-promo');
  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      const banner = document.getElementById('library-promo-banner');
      if (banner) banner.remove();
      if (typeof showToast === 'function') showToast('Banner dismissed');
    });
  }

  // Copy list link buttons
  document.querySelectorAll('[data-action="copy-list-link"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('List link copied');
    });
  });

  // Delete list buttons
  document.querySelectorAll('[data-action="delete-list"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.group');
      if (card) card.remove();
      if (typeof showToast === 'function') showToast('List deleted');
    });
  });

  // Clear reading history
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      const historySection = document.getElementById('history-section');
      if (historySection) historySection.innerHTML = '<p class="text-sm text-gray-400 italic">No reading history.</p>';
      if (typeof showToast === 'function') showToast('Reading history cleared');
    });
  }

  // Create new list form
  const createListForm = document.getElementById('create-list-form');
  if (createListForm) {
    createListForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const titleInput = createListForm.querySelector('input[type="text"]');
      const descInput = createListForm.querySelector('textarea');
      const privateCheck = document.getElementById('private-list-check');

      const title = titleInput ? titleInput.value.trim() : 'New List';
      const desc = descInput ? descInput.value.trim() : '';
      const isPrivate = privateCheck ? privateCheck.checked : true;

      const listsContainer = document.getElementById('tab-your-lists');
      if (listsContainer) {
        const newCard = document.createElement('div');
        newCard.className = 'p-6 sm:p-7 rounded-xl bg-[#f9f9f9] dark:bg-[#181818] border border-gray-100 dark:border-[#262626] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-sm transition-all group page-enter-animation';
        newCard.innerHTML = `
          <div class="space-y-2 flex-1 min-w-0">
            <div class="flex items-center space-x-2">
              <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=60&h=60&fit=crop&crop=faces" class="w-5 h-5 rounded-full object-cover ring-1 ring-red-500" alt="Author">
              <span class="text-xs font-semibold text-gray-900 dark:text-white">You</span>
            </div>
            <h3 class="font-bold text-xl text-gray-900 dark:text-white group-hover:underline">
              <a href="/story/">${escapeHtml(title)}</a>
            </h3>
            ${desc ? `<p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">${escapeHtml(desc)}</p>` : ''}
            <div class="flex items-center space-x-3 pt-1 text-xs text-gray-500">
              <span>0 stories</span>
              ${isPrivate ? '<i class="bi bi-lock-fill text-[11px] text-gray-400" title="Private list"></i>' : '<i class="bi bi-globe text-[11px] text-gray-400" title="Public list"></i>'}
              <button type="button" data-action="delete-list" class="text-red-500 hover:underline ml-2 text-xs">Delete</button>
            </div>
          </div>
          <div class="shrink-0 flex items-center justify-center bg-gray-100 dark:bg-[#202020] border border-gray-200 dark:border-[#2f2f2f] rounded-lg h-20 w-36 sm:w-44 text-gray-400 text-xs font-medium">
            Empty list
          </div>
        `;

        // Wire up delete on new card
        const delBtn = newCard.querySelector('[data-action="delete-list"]');
        if (delBtn) {
          delBtn.addEventListener('click', () => {
            newCard.remove();
            if (typeof showToast === 'function') showToast('List deleted');
          });
        }

        // Insert right after promo banner or at top
        const promoBanner = document.getElementById('library-promo-banner');
        if (promoBanner && promoBanner.nextElementSibling) {
          listsContainer.insertBefore(newCard, promoBanner.nextElementSibling);
        } else {
          listsContainer.prepend(newCard);
        }
      }

      createListForm.reset();
      const modal = document.getElementById('create-list-modal');
      if (modal) modal.classList.add('hidden');
      if (typeof showToast === 'function') showToast(`List "${title}" created successfully!`);
    });
  }
})();


/* ==========================================================================
   LOGIN PAGE — Auth form simulation
   ========================================================================== */
(function initLoginPage() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  loginForm.addEventListener('submit', (e) => {
    const btn = loginForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-70', 'cursor-not-allowed');
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Kirilmoqda...';
    }
  });
})();


/* ==========================================================================
   REGISTER PAGE — Real form submission with loading state
   ========================================================================== */
(function initRegisterPage() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  registerForm.addEventListener('submit', (e) => {
    const passwordInput = registerForm.querySelector('input[name="password"]');
    if (passwordInput && passwordInput.value.length < 8) {
      e.preventDefault();
      if (typeof showToast === 'function') {
        showToast('Parol kamida 8 ta belgidan iborat bo\'lishi kerak!');
      } else {
        alert('Parol kamida 8 ta belgidan iborat bo\'lishi kerak!');
      }
      passwordInput.focus();
      return;
    }

    const btn = registerForm.querySelector('button[type="submit"]');
    if (btn) {
      btn.disabled = true;
      btn.classList.add('opacity-70', 'cursor-not-allowed');
      btn.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Ro\'yxatdan o\'tilmoqda...';
    }
  });
})();


/* ==========================================================================
   AUTH MODAL — Modal Popup for Sign In & Sign Up (Join Medium)
   ========================================================================== */
(function initAuthModal() {
  var backdrop = document.getElementById('auth-modal-backdrop');
  if (!backdrop) return;

  var viewSignupOptions = document.getElementById('auth-view-signup-options');
  var viewSignupEmail   = document.getElementById('auth-view-signup-email');
  var viewSigninOptions = document.getElementById('auth-view-signin-options');
  var viewSigninEmail   = document.getElementById('auth-view-signin-email');

  function hideAllViews() {
    [viewSignupOptions, viewSignupEmail, viewSigninOptions, viewSigninEmail].forEach(function(v) {
      if (v) v.classList.add('hidden');
    });
  }

  function openModal(mode) {
    hideAllViews();
    if (mode === 'signin' && viewSigninOptions) {
      viewSigninOptions.classList.remove('hidden');
    } else if (viewSignupOptions) {
      viewSignupOptions.classList.remove('hidden');
    }
    var card = document.getElementById('auth-modal-card');
    if (card) {
      card.style.transition = 'none';
      card.style.opacity = '0';
      card.style.transform = 'translateY(24px) scale(0.97)';
    }
    backdrop.style.opacity = '0';
    backdrop.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        backdrop.style.transition = 'opacity 0.25s ease';
        backdrop.style.opacity = '1';
        if (card) {
          card.style.transition = 'transform 0.32s cubic-bezier(0.34,1.3,0.64,1), opacity 0.25s ease';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0) scale(1)';
        }
      });
    });
  }

  function closeModal() {
    var card = document.getElementById('auth-modal-card');
    backdrop.style.opacity = '0';
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(16px) scale(0.97)';
    }
    setTimeout(function() {
      backdrop.classList.add('hidden');
      document.body.style.overflow = '';
      if (window.location.pathname.includes('/login') || window.location.pathname.includes('/register')) {
        window.history.replaceState(null, '', '/');
      }
    }, 250);
  }

  document.querySelectorAll('[data-auth-modal]').forEach(function(trigger) {
    trigger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      openModal(trigger.dataset.authModal || 'signup');
    });
  });

  var closeBtn = document.getElementById('auth-modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  backdrop.addEventListener('click', function(e) {
    if (e.target === backdrop) closeModal();
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && !backdrop.classList.contains('hidden')) closeModal();
  });

  var btnShowEmailSignup = document.getElementById('btn-show-email-signup');
  if (btnShowEmailSignup) {
    btnShowEmailSignup.addEventListener('click', function() {
      hideAllViews();
      if (viewSignupEmail) viewSignupEmail.classList.remove('hidden');
    });
  }

  var btnBackSignupOptions = document.getElementById('btn-back-signup-options');
  if (btnBackSignupOptions) {
    btnBackSignupOptions.addEventListener('click', function() {
      hideAllViews();
      if (viewSignupOptions) viewSignupOptions.classList.remove('hidden');
    });
  }

  var btnShowEmailSignin = document.getElementById('btn-show-email-signin');
  if (btnShowEmailSignin) {
    btnShowEmailSignin.addEventListener('click', function() {
      hideAllViews();
      if (viewSigninEmail) viewSigninEmail.classList.remove('hidden');
    });
  }

  var btnBackSigninOptions = document.getElementById('btn-back-signin-options');
  if (btnBackSigninOptions) {
    btnBackSigninOptions.addEventListener('click', function() {
      hideAllViews();
      if (viewSigninOptions) viewSigninOptions.classList.remove('hidden');
    });
  }

  ['btn-goto-signin', 'btn-email-goto-signin'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function() {
      hideAllViews();
      if (viewSigninOptions) viewSigninOptions.classList.remove('hidden');
    });
  });

  ['btn-goto-signup', 'btn-email-goto-signup'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function() {
      hideAllViews();
      if (viewSignupOptions) viewSignupOptions.classList.remove('hidden');
    });
  });

  function getCsrfToken() {
    if (typeof getCookie === 'function') return getCookie('csrftoken') || '';
    var match = document.cookie.match(/csrftoken=([^;]+)/);
    return match ? match[1] : '';
  }

  var signupForm = document.getElementById('email-signup-form');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var emailInput = signupForm.querySelector('input[name="email"]') || signupForm.querySelector('input[type="email"]') || signupForm.querySelector('input[type="text"]');
      var nameInput = signupForm.querySelector('input[type="text"]:not([name="email"])');
      var email = emailInput ? emailInput.value.trim() : '';
      var name = nameInput ? nameInput.value.trim() : '';
      if (!email) return;

      var btn = signupForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      fetch('/api/auth/google/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ email: email, name: name })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          if (typeof showToast === 'function') showToast('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!');
          window.location.href = data.redirect_url || '/feed/';
        } else {
          if (btn) btn.disabled = false;
          if (typeof showToast === 'function') showToast(data.error || 'Xatolik yuz berdi');
          else alert(data.error || 'Xatolik yuz berdi');
        }
      })
      .catch(function() {
        if (btn) btn.disabled = false;
        if (typeof showToast === 'function') showToast('Xatolik yuz berdi');
      });
    });
  }

  var signinForm = document.getElementById('email-signin-form');
  if (signinForm) {
    signinForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var emailInput = signinForm.querySelector('input[name="email"]') || signinForm.querySelector('input[type="email"]') || signinForm.querySelector('input[type="text"]');
      var email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;

      var btn = signinForm.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      fetch('/api/auth/google/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ email: email })
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.success) {
          if (typeof showToast === 'function') showToast('Muvaffaqiyatli tizimga kirdingiz!');
          window.location.href = data.redirect_url || '/feed/';
        } else {
          if (btn) btn.disabled = false;
          if (typeof showToast === 'function') showToast(data.error || 'Xatolik yuz berdi');
          else alert(data.error || 'Xatolik yuz berdi');
        }
      })
      .catch(function() {
        if (btn) btn.disabled = false;
        if (typeof showToast === 'function') showToast('Xatolik yuz berdi');
      });
    });
  }

  var autoAuth = document.body.dataset.autoAuth;
  var currentPath = window.location.pathname;
  var authQuery = new URLSearchParams(window.location.search).get('auth');

  if (autoAuth === 'signin' || currentPath.includes('/login') || authQuery === 'signin') {
    openModal('signin');
  } else if (autoAuth === 'signup' || currentPath.includes('/register') || authQuery === 'signup') {
    openModal('signup');
  }
}());


/* ==========================================================================
   PROFILE PAGE — Mute, block, repost, newsletter subscribe
   ========================================================================== */
(function initProfilePage() {
  if (!document.querySelector('.profile-page-wrapper, [data-page="profile"]') &&
      !document.body.dataset.navPage?.includes('profile')) return;

  // Mute author
  document.querySelectorAll('[data-action="mute-profile"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.author || 'Author';
      if (typeof showToast === 'function') showToast(`Muted ${name}`);
      btn.closest('[data-dismissable]')?.classList.add('hidden');
    });
  });

  // Block author
  document.querySelectorAll('[data-action="block-profile"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.author || 'Author';
      if (typeof showToast === 'function') showToast(`Blocked ${name}`);
      btn.closest('[data-dismissable]')?.classList.add('hidden');
    });
  });

  // Newsletter subscribe form
  const newsletterForm = document.getElementById('newsletter-subscribe-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameEl = newsletterForm.querySelector('[data-profile-name]');
      const name   = nameEl?.textContent || 'this author';
      if (typeof showToast === 'function') showToast(`Subscribed to ${name}'s newsletter!`);
    });
  }

  // See all following link
  document.querySelectorAll('[data-action="see-all-following"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof showToast === 'function') showToast('Showing all following');
    });
  });
})();


/* ==========================================================================
   SETTINGS PAGE — Account actions
   ========================================================================== */
(function initSettingsPage() {
  // Delete account button
  const deleteBtn = document.getElementById('delete-account-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
        if (typeof showToast === 'function') showToast('Account deletion initiated');
        setTimeout(() => { window.location.href = 'index.html'; }, 1500);
      }
    });
  }

  // Edit email / username triggers
  document.querySelectorAll('[data-action="edit-email"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('Email modification modal');
    });
  });
  document.querySelectorAll('[data-action="edit-username"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('Username modification modal');
    });
  });

  // Upload photo
  document.querySelectorAll('[data-action="upload-photo"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (typeof showToast === 'function') showToast('Upload photo dialog');
    });
  });
})();


/* ==========================================================================
   INDEX (LANDING) PAGE — Footer "coming soon" links
   ========================================================================== */
(function initLandingPage() {
  if (!document.body.classList.contains('medium-landing-page')) return;

  document.querySelectorAll('[data-coming-soon]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const label = link.dataset.comingSoon || link.textContent.trim();
      if (typeof showToast === 'function') showToast(label);
    });
  });
})();
