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
   UNIVERSAL PASSWORD VISIBILITY TOGGLE
   ========================================================================== */
document.addEventListener('click', function(e) {
  var toggleBtn = e.target.closest('[data-toggle-password]');
  if (!toggleBtn) return;
  var targetId = toggleBtn.getAttribute('data-toggle-password');
  var targetInput = document.getElementById(targetId);
  if (!targetInput) return;
  var icon = toggleBtn.querySelector('i');
  if (targetInput.type === 'password') {
    targetInput.type = 'text';
    if (icon) icon.className = 'bi bi-eye-slash';
  } else {
    targetInput.type = 'password';
    if (icon) icon.className = 'bi bi-eye';
  }
});

/* ==========================================================================
   REGISTER PAGE — 2-Step OTP Registration Flow
   ========================================================================== */
(function initRegisterPage() {
  const step1 = document.getElementById('regpage-step-1');
  const step2 = document.getElementById('regpage-step-2');
  if (!step1 || !step2) return;

  const step1Form = document.getElementById('regpage-step1-form');
  const step1Error = document.getElementById('regpage-step1-error');
  const emailInput = document.getElementById('regpage-email-input');
  const displayEmail = document.getElementById('regpage-display-email');
  const btnSendOtp = document.getElementById('btn-regpage-send-otp');

  const step2Form = document.getElementById('regpage-step2-form');
  const step2Error = document.getElementById('regpage-step2-error');
  const otpInput = document.getElementById('regpage-otp-input');
  const nameInput = document.getElementById('regpage-name-input');
  const passwordInput = document.getElementById('regpage-password-input');
  const btnResend = document.getElementById('btn-resend-regpage-otp');
  const btnComplete = document.getElementById('btn-regpage-complete');
  const btnChangeEmail = document.getElementById('btn-regpage-change-email');
  const btnBack = document.getElementById('btn-regpage-back');

  function getCsrf() {
    if (typeof getCookie === 'function') return getCookie('csrftoken') || '';
    const m = document.cookie.match(/csrftoken=([^;]+)/);
    return m ? m[1] : '';
  }

  let cooldownTimer = null;
  function startCooldown(sec) {
    if (cooldownTimer) clearInterval(cooldownTimer);
    let remaining = sec || 60;
    if (btnResend) {
      btnResend.disabled = true;
      btnResend.innerHTML = 'Resend in <span id="regpage-cooldown-timer">' + remaining + '</span>s';
    }
    cooldownTimer = setInterval(() => {
      remaining--;
      const curSpan = document.getElementById('regpage-cooldown-timer');
      if (curSpan) curSpan.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        if (btnResend) {
          btnResend.disabled = false;
          btnResend.textContent = 'Resend code';
        }
      }
    }, 1000);
  }

  // Step 1: Send OTP
  if (step1Form) {
    step1Form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (step1Error) {
        step1Error.classList.add('hidden');
        step1Error.innerHTML = '';
      }
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;

      const origText = btnSendOtp ? btnSendOtp.innerHTML : '';
      if (btnSendOtp) {
        btnSendOtp.disabled = true;
        btnSendOtp.classList.add('opacity-70', 'cursor-not-allowed');
        btnSendOtp.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Sending code...';
      }

      fetch('/api/auth/send-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrf()
        },
        body: JSON.stringify({ email: email })
      })
      .then(res => res.json().then(data => ({ status: res.status, data: data })))
      .then(result => {
        const data = result.data;
        if (data.success) {
          if (displayEmail) displayEmail.textContent = email;
          step1.classList.add('hidden');
          step2.classList.remove('hidden');
          if (otpInput) {
            otpInput.value = '';
            setTimeout(() => otpInput.focus(), 150);
          }
          startCooldown(data.cooldown || 60);
          if (typeof showToast === 'function') showToast(data.message || 'Verification code sent to your email!');
        } else {
          if (step1Error) {
            step1Error.textContent = data.error || 'Failed to send code.';
            if (data.already_registered) {
              step1Error.innerHTML = (data.error || 'Account exists.') + ' <a href="/login/" class="underline font-bold ml-1">Sign in</a>';
            }
            step1Error.classList.remove('hidden');
          } else {
            alert(data.error || 'Failed to send code.');
          }
        }
      })
      .catch(() => {
        if (step1Error) {
          step1Error.textContent = 'Network error. Please try again.';
          step1Error.classList.remove('hidden');
        }
      })
      .finally(() => {
        if (btnSendOtp) {
          btnSendOtp.disabled = false;
          btnSendOtp.classList.remove('opacity-70', 'cursor-not-allowed');
          btnSendOtp.innerHTML = origText;
        }
      });
    });
  }

  // Back / Change Email
  [btnChangeEmail, btnBack].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
        if (emailInput) emailInput.focus();
      });
    }
  });

  // Resend OTP
  if (btnResend) {
    btnResend.addEventListener('click', (e) => {
      e.preventDefault();
      if (btnResend.disabled) return;
      const email = emailInput ? emailInput.value.trim() : '';
      if (!email) return;

      btnResend.disabled = true;
      btnResend.textContent = 'Sending...';

      fetch('/api/auth/send-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrf()
        },
        body: JSON.stringify({ email: email })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          startCooldown(data.cooldown || 60);
          if (step2Error) step2Error.classList.add('hidden');
          if (typeof showToast === 'function') showToast('New verification code sent!');
        } else {
          btnResend.disabled = false;
          btnResend.textContent = 'Resend code';
          if (step2Error) {
            step2Error.textContent = data.error || 'Failed to resend code';
            step2Error.classList.remove('hidden');
          }
        }
      })
      .catch(() => {
        btnResend.disabled = false;
        btnResend.textContent = 'Resend code';
      });
    });
  }

  // Step 2: Complete Registration
  if (step2Form) {
    step2Form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (step2Error) {
        step2Error.classList.add('hidden');
        step2Error.textContent = '';
      }

      const email = emailInput ? emailInput.value.trim() : '';
      const otpCode = otpInput ? otpInput.value.trim() : '';
      const fullName = nameInput ? nameInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!otpCode || otpCode.length !== 6) {
        if (step2Error) {
          step2Error.textContent = 'Iltimos, 6 xonali tasdiqlash kodini to\'liq kiriting.';
          step2Error.classList.remove('hidden');
        }
        if (otpInput) otpInput.focus();
        return;
      }

      if (!fullName) {
        if (step2Error) {
          step2Error.textContent = 'Iltimos, to\'liq ismingizni kiriting.';
          step2Error.classList.remove('hidden');
        }
        if (nameInput) nameInput.focus();
        return;
      }

      if (!password || password.length < 8) {
        if (step2Error) {
          step2Error.textContent = 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak.';
          step2Error.classList.remove('hidden');
        }
        if (passwordInput) passwordInput.focus();
        return;
      }

      const origText = btnComplete ? btnComplete.innerHTML : '';
      if (btnComplete) {
        btnComplete.disabled = true;
        btnComplete.classList.add('opacity-70', 'cursor-not-allowed');
        btnComplete.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Creating account...';
      }

      fetch('/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrf()
        },
        body: JSON.stringify({
          email: email,
          otp_code: otpCode,
          full_name: fullName,
          password: password,
          remember: true
        })
      })
      .then(res => res.json().then(data => ({ status: res.status, data: data })))
      .then(result => {
        const data = result.data;
        if (data.success) {
          if (typeof showToast === 'function') showToast('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!');
          window.location.href = data.redirect_url || '/';
        } else {
          if (step2Error) {
            step2Error.textContent = data.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi.';
            step2Error.classList.remove('hidden');
          } else {
            alert(data.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi.');
          }
          if (btnComplete) {
            btnComplete.disabled = false;
            btnComplete.classList.remove('opacity-70', 'cursor-not-allowed');
            btnComplete.innerHTML = origText;
          }
        }
      })
      .catch(() => {
        if (step2Error) {
          step2Error.textContent = 'Server bilan bog\'lanishda xatolik yuz berdi.';
          step2Error.classList.remove('hidden');
        }
        if (btnComplete) {
          btnComplete.disabled = false;
          btnComplete.classList.remove('opacity-70', 'cursor-not-allowed');
          btnComplete.innerHTML = origText;
        }
      });
    });
  }
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

  var signupStep1 = document.getElementById('signup-step-1');
  var signupStep2 = document.getElementById('signup-step-2');
  var signupStep1Error = document.getElementById('signup-step1-error');
  var signupStep2Error = document.getElementById('signup-step2-error');
  var signupEmailInput = document.getElementById('signup-email-input');
  var signupDisplayEmail = document.getElementById('signup-display-email');
  var btnSendSignupOtp = document.getElementById('btn-send-signup-otp');
  var btnResendSignupOtp = document.getElementById('btn-resend-signup-otp');
  var signupOtpInput = document.getElementById('signup-otp-input');
  var signupNameInput = document.getElementById('signup-name-input');
  var signupPasswordInput = document.getElementById('signup-password-input');
  var signupRememberCheck = document.getElementById('signup-remember-check');
  var btnCompleteSignup = document.getElementById('btn-complete-signup');

  var modalCooldownTimer = null;
  function startModalCooldown(seconds) {
    if (modalCooldownTimer) clearInterval(modalCooldownTimer);
    var remaining = seconds || 60;
    if (btnResendSignupOtp) {
      btnResendSignupOtp.disabled = true;
      btnResendSignupOtp.innerHTML = 'Resend in <span id="signup-cooldown-timer">' + remaining + '</span>s';
    }
    modalCooldownTimer = setInterval(function() {
      remaining--;
      var span = document.getElementById('signup-cooldown-timer');
      if (span) span.textContent = remaining;
      if (remaining <= 0) {
        clearInterval(modalCooldownTimer);
        modalCooldownTimer = null;
        if (btnResendSignupOtp) {
          btnResendSignupOtp.disabled = false;
          btnResendSignupOtp.textContent = 'Resend code';
        }
      }
    }, 1000);
  }

  function resetModalSignupState() {
    if (signupStep1) signupStep1.classList.remove('hidden');
    if (signupStep2) signupStep2.classList.add('hidden');
    if (signupStep1Error) {
      signupStep1Error.classList.add('hidden');
      signupStep1Error.innerHTML = '';
    }
    if (signupStep2Error) {
      signupStep2Error.classList.add('hidden');
      signupStep2Error.innerHTML = '';
    }
  }

  var btnShowEmailSignup = document.getElementById('btn-show-email-signup');
  if (btnShowEmailSignup) {
    btnShowEmailSignup.addEventListener('click', function() {
      hideAllViews();
      resetModalSignupState();
      if (viewSignupEmail) viewSignupEmail.classList.remove('hidden');
      if (signupEmailInput) setTimeout(function() { signupEmailInput.focus(); }, 150);
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
      var signinErr = document.getElementById('signin-email-error');
      if (signinErr) {
        signinErr.classList.add('hidden');
        signinErr.innerHTML = '';
      }
      if (viewSigninEmail) viewSigninEmail.classList.remove('hidden');
      var signinIdent = document.getElementById('signin-identifier-input');
      if (signinIdent) setTimeout(function() { signinIdent.focus(); }, 150);
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

  // --- Modal Signup Step 1: Send OTP ---
  var signupStep1Form = document.getElementById('signup-step1-form');
  if (signupStep1Form) {
    signupStep1Form.addEventListener('submit', function(e) {
      e.preventDefault();
      if (signupStep1Error) {
        signupStep1Error.classList.add('hidden');
        signupStep1Error.innerHTML = '';
      }

      var email = signupEmailInput ? signupEmailInput.value.trim() : '';
      if (!email) return;

      var origBtnText = btnSendSignupOtp ? btnSendSignupOtp.innerHTML : '';
      if (btnSendSignupOtp) {
        btnSendSignupOtp.disabled = true;
        btnSendSignupOtp.classList.add('opacity-70', 'cursor-not-allowed');
        btnSendSignupOtp.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Sending code...';
      }

      fetch('/api/auth/send-otp/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({ email: email })
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { status: res.status, data: data };
        });
      })
      .then(function(result) {
        var data = result.data;
        if (data.success) {
          if (signupDisplayEmail) signupDisplayEmail.textContent = email;
          if (signupStep1) signupStep1.classList.add('hidden');
          if (signupStep2) signupStep2.classList.remove('hidden');
          if (signupOtpInput) {
            signupOtpInput.value = '';
            setTimeout(function() { signupOtpInput.focus(); }, 150);
          }
          startModalCooldown(data.cooldown || 60);
          if (typeof showToast === 'function') showToast(data.message || 'Verification code sent to your email!');
        } else {
          if (signupStep1Error) {
            signupStep1Error.textContent = data.error || 'Failed to send code.';
            if (data.already_registered) {
              signupStep1Error.innerHTML = (data.error || 'Account exists.') + ' <button type="button" class="underline font-bold ml-1" id="link-modal-err-signin">Sign in</button>';
              var errSigninBtn = document.getElementById('link-modal-err-signin');
              if (errSigninBtn) {
                errSigninBtn.addEventListener('click', function() {
                  hideAllViews();
                  if (viewSigninEmail) {
                    viewSigninEmail.classList.remove('hidden');
                    var signinIdent = document.getElementById('signin-identifier-input');
                    if (signinIdent) signinIdent.value = email;
                  }
                });
              }
            }
            signupStep1Error.classList.remove('hidden');
          } else {
            alert(data.error || 'Failed to send code.');
          }
        }
      })
      .catch(function() {
        if (signupStep1Error) {
          signupStep1Error.textContent = 'Network error. Please try again.';
          signupStep1Error.classList.remove('hidden');
        }
      })
      .finally(function() {
        if (btnSendSignupOtp) {
          btnSendSignupOtp.disabled = false;
          btnSendSignupOtp.classList.remove('opacity-70', 'cursor-not-allowed');
          btnSendSignupOtp.innerHTML = origBtnText;
        }
      });
    });
  }

  // Back to Step 1 / Change Email
  ['btn-signup-change-email', 'btn-back-to-step1'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        if (signupStep2) signupStep2.classList.add('hidden');
        if (signupStep1) signupStep1.classList.remove('hidden');
        if (signupEmailInput) setTimeout(function() { signupEmailInput.focus(); }, 100);
      });
    }
  });

  // Resend OTP in Modal
  if (btnResendSignupOtp) {
    btnResendSignupOtp.addEventListener('click', function(e) {
      e.preventDefault();
      if (btnResendSignupOtp.disabled) return;
      var email = signupEmailInput ? signupEmailInput.value.trim() : '';
      if (!email) return;

      btnResendSignupOtp.disabled = true;
      btnResendSignupOtp.textContent = 'Sending...';

      fetch('/api/auth/send-otp/', {
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
          startModalCooldown(data.cooldown || 60);
          if (signupStep2Error) signupStep2Error.classList.add('hidden');
          if (typeof showToast === 'function') showToast('New verification code sent!');
        } else {
          btnResendSignupOtp.disabled = false;
          btnResendSignupOtp.textContent = 'Resend code';
          if (signupStep2Error) {
            signupStep2Error.textContent = data.error || 'Failed to resend code';
            signupStep2Error.classList.remove('hidden');
          }
        }
      })
      .catch(function() {
        btnResendSignupOtp.disabled = false;
        btnResendSignupOtp.textContent = 'Resend code';
      });
    });
  }

  // --- Modal Signup Step 2: Complete Registration ---
  var signupStep2Form = document.getElementById('signup-step2-form');
  if (signupStep2Form) {
    signupStep2Form.addEventListener('submit', function(e) {
      e.preventDefault();
      if (signupStep2Error) {
        signupStep2Error.classList.add('hidden');
        signupStep2Error.textContent = '';
      }

      var email = signupEmailInput ? signupEmailInput.value.trim() : '';
      var otpCode = signupOtpInput ? signupOtpInput.value.trim() : '';
      var fullName = signupNameInput ? signupNameInput.value.trim() : '';
      var password = signupPasswordInput ? signupPasswordInput.value : '';
      var remember = signupRememberCheck ? signupRememberCheck.checked : true;

      if (!otpCode || otpCode.length !== 6) {
        if (signupStep2Error) {
          signupStep2Error.textContent = 'Iltimos, 6 xonali tasdiqlash kodini to\'liq kiriting.';
          signupStep2Error.classList.remove('hidden');
        }
        if (signupOtpInput) signupOtpInput.focus();
        return;
      }

      if (!fullName) {
        if (signupStep2Error) {
          signupStep2Error.textContent = 'Iltimos, to\'liq ismingizni kiriting.';
          signupStep2Error.classList.remove('hidden');
        }
        if (signupNameInput) signupNameInput.focus();
        return;
      }

      if (!password || password.length < 8) {
        if (signupStep2Error) {
          signupStep2Error.textContent = 'Parol kamida 8 ta belgidan iborat bo\'lishi kerak.';
          signupStep2Error.classList.remove('hidden');
        }
        if (signupPasswordInput) signupPasswordInput.focus();
        return;
      }

      var origBtnText = btnCompleteSignup ? btnCompleteSignup.innerHTML : '';
      if (btnCompleteSignup) {
        btnCompleteSignup.disabled = true;
        btnCompleteSignup.classList.add('opacity-70', 'cursor-not-allowed');
        btnCompleteSignup.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Creating account...';
      }

      fetch('/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
          email: email,
          otp_code: otpCode,
          full_name: fullName,
          password: password,
          remember: remember
        })
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { status: res.status, data: data };
        });
      })
      .then(function(result) {
        var data = result.data;
        if (data.success) {
          if (typeof showToast === 'function') showToast('Muvaffaqiyatli ro\'yxatdan o\'tdingiz!');
          window.location.href = data.redirect_url || '/';
        } else {
          if (signupStep2Error) {
            signupStep2Error.textContent = data.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi.';
            signupStep2Error.classList.remove('hidden');
          } else {
            alert(data.error || 'Ro\'yxatdan o\'tishda xatolik yuz berdi.');
          }
          if (btnCompleteSignup) {
            btnCompleteSignup.disabled = false;
            btnCompleteSignup.classList.remove('opacity-70', 'cursor-not-allowed');
            btnCompleteSignup.innerHTML = origBtnText;
          }
        }
      })
      .catch(function() {
        if (signupStep2Error) {
          signupStep2Error.textContent = 'Server bilan bog\'lanishda xatolik yuz berdi.';
          signupStep2Error.classList.remove('hidden');
        }
        if (btnCompleteSignup) {
          btnCompleteSignup.disabled = false;
          btnCompleteSignup.classList.remove('opacity-70', 'cursor-not-allowed');
          btnCompleteSignup.innerHTML = origBtnText;
        }
      });
    });
  }

  // --- Modal Sign In: Password Authentication ---
  var signinForm = document.getElementById('email-signin-form');
  var signinEmailError = document.getElementById('signin-email-error');
  var btnSubmitSignin = document.getElementById('btn-submit-signin');

  if (signinForm) {
    signinForm.addEventListener('submit', function(e) {
      e.preventDefault();
      if (signinEmailError) {
        signinEmailError.classList.add('hidden');
        signinEmailError.textContent = '';
      }

      var identInput = document.getElementById('signin-identifier-input');
      var passInput = document.getElementById('signin-password-input');
      var remInput = document.getElementById('signin-remember-check');

      var identifier = identInput ? identInput.value.trim() : '';
      var password = passInput ? passInput.value : '';
      var remember = remInput ? remInput.checked : true;

      if (!identifier || !password) {
        if (signinEmailError) {
          signinEmailError.textContent = 'Email / username va parolni kiriting.';
          signinEmailError.classList.remove('hidden');
        }
        return;
      }

      var origBtnText = btnSubmitSignin ? btnSubmitSignin.innerHTML : '';
      if (btnSubmitSignin) {
        btnSubmitSignin.disabled = true;
        btnSubmitSignin.classList.add('opacity-70', 'cursor-not-allowed');
        btnSubmitSignin.innerHTML = '<span class="inline-block animate-spin mr-2">⟳</span> Kirilmoqda...';
      }

      fetch('/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken()
        },
        body: JSON.stringify({
          identifier: identifier,
          password: password,
          remember: remember
        })
      })
      .then(function(res) {
        return res.json().then(function(data) {
          return { status: res.status, data: data };
        });
      })
      .then(function(result) {
        var data = result.data;
        if (data.success) {
          if (typeof showToast === 'function') showToast('Muvaffaqiyatli tizimga kirdingiz!');
          window.location.href = data.redirect_url || '/';
        } else {
          if (signinEmailError) {
            signinEmailError.textContent = data.error || 'Noto\'g\'ri login yoki parol.';
            signinEmailError.classList.remove('hidden');
          } else {
            alert(data.error || 'Noto\'g\'ri login yoki parol.');
          }
          if (btnSubmitSignin) {
            btnSubmitSignin.disabled = false;
            btnSubmitSignin.classList.remove('opacity-70', 'cursor-not-allowed');
            btnSubmitSignin.innerHTML = origBtnText;
          }
        }
      })
      .catch(function() {
        if (signinEmailError) {
          signinEmailError.textContent = 'Server bilan bog\'lanishda xatolik yuz berdi.';
          signinEmailError.classList.remove('hidden');
        }
        if (btnSubmitSignin) {
          btnSubmitSignin.disabled = false;
          btnSubmitSignin.classList.remove('opacity-70', 'cursor-not-allowed');
          btnSubmitSignin.innerHTML = origBtnText;
        }
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
