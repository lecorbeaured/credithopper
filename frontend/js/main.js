/* ============================================
   CREDITHOPPER - JavaScript
   Vanilla JS for interactions and animations
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize splash screen first
  initSplashScreen();
  
  // Initialize all components
  initCurrentYear();
  initAnimations();
  initModals();
  initMobileNav();
  initForms();
  initRevealAnimations();
  initScrollToTop();
});

/* ============================================
   SCROLL TO TOP BUTTON
   ============================================ */
function initScrollToTop() {
  // Check if page is long enough to need scroll-to-top
  // Only add if page is taller than 2x viewport height
  if (document.body.scrollHeight < window.innerHeight * 2) return;
  
  // Create the button
  const button = document.createElement('button');
  button.className = 'scroll-to-top';
  button.setAttribute('aria-label', 'Scroll to top');
  button.innerHTML = `
    <div class="scroll-to-top-progress">
      <svg viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="24"></circle>
      </svg>
    </div>
    <i data-lucide="chevron-up"></i>
  `;
  
  document.body.appendChild(button);
  
  // Initialize Lucide icon
  if (window.lucide) lucide.createIcons();
  
  const progressCircle = button.querySelector('.scroll-to-top-progress circle');
  const circumference = 150; // Match stroke-dasharray
  
  // Update progress and visibility on scroll
  let ticking = false;
  
  const updateButton = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = scrollTop / scrollHeight;
    
    // Show button after scrolling 300px
    if (scrollTop > 300) {
      button.classList.add('visible');
    } else {
      button.classList.remove('visible');
    }
    
    // Update progress ring
    if (progressCircle) {
      const offset = circumference - (scrollPercent * circumference);
      progressCircle.style.strokeDashoffset = offset;
    }
    
    ticking = false;
  };
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateButton);
      ticking = true;
    }
  }, { passive: true });
  
  // Scroll to top on click
  button.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
  
  // Initial check
  updateButton();
}

/* ============================================
   SPLASH SCREEN
   ============================================ */
function initSplashScreen() {
  const splash = document.getElementById('splashScreen');
  if (!splash) return;
  
  // Check if user has already seen the splash this session
  const hasSeenSplash = sessionStorage.getItem('credithopper_splash_seen');
  
  if (hasSeenSplash) {
    // Skip splash - remove immediately and show page
    splash.remove();
    document.body.classList.add('page-loaded');
    triggerPageAnimations();
    return;
  }
  
  // Mark splash as seen for this session
  sessionStorage.setItem('credithopper_splash_seen', 'true');
  
  // Animation sequence
  const splashLogo = document.getElementById('splashLogoIcon');
  const splashLogoWrapper = document.getElementById('splashLogoWrapper');
  const splashFinalLogo = document.getElementById('splashFinalLogo');
  const splashTagline = document.getElementById('splashTagline');
  const splashLoadingBar = document.getElementById('splashLoadingBar');
  
  // Phase 1: Loading bar completes at ~3.5s, trigger hop
  setTimeout(() => {
    if (splashLogo) {
      splashLogo.classList.add('hop');
    }
  }, 3500);
  
  // Phase 2: After hop completes (~4.3s), start transition
  setTimeout(() => {
    // First: Hide tagline and loading bar immediately
    if (splashTagline) {
      splashTagline.classList.add('move-down');
    }
    if (splashLoadingBar) {
      splashLoadingBar.classList.add('move-down');
    }
    
    // Then: Hide the centered logo
    if (splashLogoWrapper) {
      splashLogoWrapper.classList.add('hidden');
    }
    
    // Finally: Show the horizontal logo lockup (delayed slightly)
    setTimeout(() => {
      if (splashFinalLogo) {
        splashFinalLogo.classList.add('visible');
      }
    }, 300);
  }, 4300);
  
  // Minimum display time for splash (5.5 seconds total for full animation)
  const minDisplayTime = 5500;
  const startTime = Date.now();
  
  // Wait for page to fully load
  window.addEventListener('load', () => {
    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);
    
    setTimeout(() => {
      splash.classList.add('fade-out');
      
      // Remove from DOM after transition
      setTimeout(() => {
        splash.remove();
        // Trigger page animations after splash
        document.body.classList.add('page-loaded');
        triggerPageAnimations();
      }, 800);
    }, remainingTime);
  });
}

function triggerPageAnimations() {
  // Add stagger animations to hero elements
  const heroElements = document.querySelectorAll('.hero-landing .animate-on-load');
  heroElements.forEach((el, i) => {
    el.style.animationDelay = `${i * 0.1}s`;
  });
}

/* ============================================
   LOADING OVERLAY SYSTEM
   ============================================ */
window.CreditHopperLoader = {
  // Show full page loading overlay
  show: function(options = {}) {
    const defaults = {
      title: 'Loading...',
      subtitle: 'Please wait',
      showProgress: false,
      steps: null
    };
    const config = { ...defaults, ...options };
    
    // Remove existing loader
    this.hide();
    
    const overlay = document.createElement('div');
    overlay.id = 'loadingOverlay';
    overlay.className = 'loading-overlay';
    
    let content = `
      <div class="loading-content">
        <div class="loader-logo">
          <svg viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient id="loaderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#34d399"/>
                <stop offset="100%" stop-color="#06b6d4"/>
              </linearGradient>
            </defs>
            <circle cx="24" cy="24" r="22" fill="url(#loaderGrad)"/>
            <path d="M14 24L21 31L34 17" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
    `;
    
    if (config.showProgress) {
      content += `
        <div class="loader-progress">
          <div class="loader-progress-bar">
            <div class="loader-progress-fill" id="loaderProgressFill"></div>
          </div>
          <p class="loader-status" id="loaderStatus">${config.title}</p>
          <p class="loader-percentage" id="loaderPercentage">0%</p>
        </div>
      `;
    } else {
      content += `
        <h3 style="color: #fff; margin-bottom: 0.5rem;">${config.title}</h3>
        <p style="color: var(--dark-400);">${config.subtitle}</p>
      `;
    }
    
    content += '</div>';
    overlay.innerHTML = content;
    document.body.appendChild(overlay);
    
    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('active');
    });
    
    return overlay;
  },
  
  // Hide loading overlay
  hide: function() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      setTimeout(() => overlay.remove(), 300);
    }
  },
  
  // Update progress
  setProgress: function(percent, status = null) {
    const fill = document.getElementById('loaderProgressFill');
    const percentEl = document.getElementById('loaderPercentage');
    const statusEl = document.getElementById('loaderStatus');
    
    if (fill) fill.style.width = `${percent}%`;
    if (percentEl) percentEl.textContent = `${Math.round(percent)}%`;
    if (status && statusEl) statusEl.textContent = status;
  }
};

/* ============================================
   LETTER GENERATION LOADER
   ============================================ */
window.GenerationLoader = {
  show: function(container, options = {}) {
    const defaults = {
      title: 'Generating Your Letters',
      subtitle: 'Our AI is crafting personalized dispute letters',
      steps: [
        { icon: 'scan', text: 'Analyzing credit report...' },
        { icon: 'search', text: 'Identifying disputable items...' },
        { icon: 'file-text', text: 'Generating letters...' },
        { icon: 'check-circle', text: 'Finalizing documents...' }
      ]
    };
    const config = { ...defaults, ...options };
    
    const loaderHTML = `
      <div class="generation-loader" id="generationLoader">
        <div class="generation-icon">
          <div class="generation-icon-inner">
            <i data-lucide="sparkles"></i>
          </div>
          <div class="generation-rings">
            <div class="generation-ring"></div>
            <div class="generation-ring"></div>
            <div class="generation-ring"></div>
          </div>
        </div>
        
        <h3 class="generation-title">${config.title}</h3>
        <p class="generation-subtitle">${config.subtitle}</p>
        
        <div class="generation-steps">
          ${config.steps.map((step, i) => `
            <div class="generation-step" data-step="${i}">
              <div class="generation-step-icon">
                <i data-lucide="${step.icon}"></i>
              </div>
              <span class="generation-step-text">${step.text}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    if (typeof container === 'string') {
      container = document.querySelector(container);
    }
    
    container.innerHTML = loaderHTML;
    
    // Initialize icons
    if (window.lucide) lucide.createIcons();
    
    // Start step animation
    this.animateSteps(container, config.steps.length);
    
    return container;
  },
  
  animateSteps: function(container, totalSteps) {
    let currentStep = 0;
    const steps = container.querySelectorAll('.generation-step');
    
    const advanceStep = () => {
      if (currentStep > 0) {
        steps[currentStep - 1].classList.remove('active');
        steps[currentStep - 1].classList.add('complete');
      }
      
      if (currentStep < totalSteps) {
        steps[currentStep].classList.add('active');
        currentStep++;
        
        // Random delay between 800-1500ms for realistic feel
        const delay = 800 + Math.random() * 700;
        setTimeout(advanceStep, delay);
      }
    };
    
    // Start first step
    advanceStep();
  },
  
  complete: function(container) {
    const steps = container.querySelectorAll('.generation-step');
    steps.forEach(step => {
      step.classList.remove('active');
      step.classList.add('complete');
    });
  }
};

/* ============================================
   SKELETON LOADING
   ============================================ */
window.SkeletonLoader = {
  // Generate skeleton card HTML
  card: function(count = 1) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton skeleton-text lg" style="width: 60%;"></div>
          <div class="skeleton skeleton-text" style="width: 100%;"></div>
          <div class="skeleton skeleton-text" style="width: 80%;"></div>
          <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
            <div class="skeleton" style="width: 80px; height: 32px;"></div>
            <div class="skeleton" style="width: 80px; height: 32px;"></div>
          </div>
        </div>
      `;
    }
    return html;
  },
  
  // Generate skeleton letter preview
  letterPreview: function() {
    return `
      <div class="skeleton-card" style="padding: 2rem;">
        <div class="skeleton skeleton-text lg" style="width: 50%; margin-bottom: 1.5rem;"></div>
        <div class="skeleton skeleton-text" style="width: 30%;"></div>
        <div class="skeleton skeleton-text" style="width: 35%;"></div>
        <div class="skeleton skeleton-text" style="width: 25%; margin-bottom: 1.5rem;"></div>
        <div class="skeleton skeleton-text" style="width: 100%;"></div>
        <div class="skeleton skeleton-text" style="width: 100%;"></div>
        <div class="skeleton skeleton-text" style="width: 90%;"></div>
        <div class="skeleton skeleton-text" style="width: 100%; margin-bottom: 1rem;"></div>
        <div class="skeleton skeleton-text" style="width: 100%;"></div>
        <div class="skeleton skeleton-text" style="width: 85%;"></div>
        <div class="skeleton skeleton-text" style="width: 100%;"></div>
      </div>
    `;
  }
};

/* ============================================
   TOAST NOTIFICATIONS (Enhanced)
   ============================================ */
window.Toast = {
  container: null,
  
  init: function() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },
  
  show: function(message, type = 'info', duration = 4000) {
    this.init();
    
    const icons = {
      success: 'check-circle',
      error: 'x-circle',
      warning: 'alert-triangle',
      info: 'info'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i data-lucide="${icons[type] || icons.info}" class="toast-icon"></i>
      <span class="toast-message">${message}</span>
    `;
    
    this.container.appendChild(toast);
    
    if (window.lucide) lucide.createIcons();
    
    // Auto remove
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
    
    return toast;
  },
  
  success: function(message, duration) {
    return this.show(message, 'success', duration);
  },
  
  error: function(message, duration) {
    return this.show(message, 'error', duration);
  },
  
  warning: function(message, duration) {
    return this.show(message, 'warning', duration);
  },
  
  info: function(message, duration) {
    return this.show(message, 'info', duration);
  }
};

/* ============================================
   CONFETTI EFFECT
   ============================================ */
window.Confetti = {
  launch: function(count = 50) {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    for (let i = 0; i < count; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
      container.appendChild(confetti);
    }
    
    // Cleanup after animation
    setTimeout(() => container.remove(), 5000);
  }
};

/* ============================================
   REVEAL ANIMATIONS ON SCROLL
   ============================================ */
function initRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal');
  
  if (reveals.length === 0) return;
  
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  reveals.forEach(el => revealObserver.observe(el));
}

/* ============================================
   CURRENT YEAR (Footer)
   ============================================ */
function initCurrentYear() {
  const yearElements = document.querySelectorAll('.current-year');
  const currentYear = new Date().getFullYear();
  
  yearElements.forEach(el => {
    el.textContent = currentYear;
  });
}

/* ============================================
   ANIMATIONS
   ============================================ */
function initAnimations() {
  // Animate elements on load
  const animatedElements = document.querySelectorAll('.animate-on-load');
  animatedElements.forEach((el, index) => {
    el.style.animationDelay = `${index * 0.1}s`;
    el.classList.add('animate-fade-in-up');
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-fade-in-up');
        entry.target.style.opacity = '1';
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

/* ============================================
   MODALS
   ============================================ */
function initModals() {
  // Open modal
  document.querySelectorAll('[data-modal-open]').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const modalId = trigger.getAttribute('data-modal-open');
      const modal = document.getElementById(modalId);
      if (modal) _openModal(modal);
    });
  });

  // Close modal buttons
  document.querySelectorAll('[data-modal-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) _closeModal(modal);
    });
  });

  // Close on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) _closeModal(overlay);
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) _closeModal(activeModal);
    }
  });
}

function _openModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Focus first focusable element
  const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
  if (focusable) focusable.focus();
}

function _closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Global functions for inline onclick
window.openModal = (id) => {
  const modal = typeof id === 'string' ? document.getElementById(id) : id;
  if (modal) _openModal(modal);
};

window.closeModal = (id) => {
  const modal = typeof id === 'string' ? document.getElementById(id) : id;
  if (modal) _closeModal(modal);
};

/* ============================================
   MOBILE NAVIGATION
   ============================================ */
function initMobileNav() {
  const mobileToggle = document.querySelector('.mobile-nav-toggle');
  const mobileNav = document.querySelector('.mobile-nav');

  if (mobileToggle && mobileNav) {
    mobileToggle.addEventListener('click', () => {
      mobileNav.classList.toggle('active');
      mobileToggle.setAttribute('aria-expanded', 
        mobileNav.classList.contains('active'));
    });
  }
}

/* ============================================
   FORMS
   ============================================ */
function initForms() {
  // Input focus effects
  document.querySelectorAll('.input, .textarea, .select').forEach(input => {
    input.addEventListener('focus', () => {
      input.parentElement?.classList.add('focused');
    });
    
    input.addEventListener('blur', () => {
      input.parentElement?.classList.remove('focused');
    });
  });

  // Form validation
  document.querySelectorAll('form[data-validate]').forEach(form => {
    form.addEventListener('submit', (e) => {
      if (!validateForm(form)) {
        e.preventDefault();
      }
    });
  });

  // Real-time validation
  document.querySelectorAll('[data-validate-on="input"]').forEach(input => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });
}

function validateForm(form) {
  let isValid = true;
  const inputs = form.querySelectorAll('[required]');
  
  inputs.forEach(input => {
    if (!validateInput(input)) {
      isValid = false;
    }
  });
  
  return isValid;
}

function validateInput(input) {
  const value = input.value.trim();
  const type = input.type;
  let isValid = true;
  let errorMessage = '';

  // Required check
  if (input.hasAttribute('required') && !value) {
    isValid = false;
    errorMessage = 'This field is required';
  }
  
  // Email validation
  else if (type === 'email' && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      isValid = false;
      errorMessage = 'Please enter a valid email address';
    }
  }
  
  // Min length
  else if (input.hasAttribute('minlength')) {
    const minLength = parseInt(input.getAttribute('minlength'));
    if (value.length < minLength) {
      isValid = false;
      errorMessage = `Minimum ${minLength} characters required`;
    }
  }

  // Update UI
  const errorEl = input.parentElement?.querySelector('.form-error');
  if (!isValid) {
    input.classList.add('error');
    if (errorEl) errorEl.textContent = errorMessage;
  } else {
    input.classList.remove('error');
    if (errorEl) errorEl.textContent = '';
  }

  return isValid;
}

/* ============================================
   BUTTON LOADING STATE
   ============================================ */
window.setButtonLoading = (button, isLoading) => {
  if (isLoading) {
    button.classList.add('btn-loading');
    button.disabled = true;
    button.dataset.originalText = button.textContent;
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
    if (button.dataset.originalText) {
      button.textContent = button.dataset.originalText;
    }
  }
};

/* ============================================
   PROGRESS BAR
   ============================================ */
window.setProgress = (progressEl, value) => {
  const bar = progressEl.querySelector('.progress-bar');
  if (bar) {
    bar.style.width = `${Math.min(100, Math.max(0, value))}%`;
  }
  
  const label = progressEl.querySelector('.progress-label');
  if (label) {
    label.textContent = `${Math.round(value)}%`;
  }
};

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
window.showToast = (message, type = 'default', duration = 3000) => {
  const container = document.getElementById('toast-container') || createToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slide-in`;
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
};

function createToastContainer() {
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  `;
  document.body.appendChild(container);
  return container;
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const href = this.getAttribute('href');
    if (href === '#') return;
    
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

/* ============================================
   NAV SCROLL EFFECT
   ============================================ */
let lastScroll = 0;
const nav = document.querySelector('.nav');

if (nav) {
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
      nav.classList.add('nav-scrolled');
    } else {
      nav.classList.remove('nav-scrolled');
    }
    
    lastScroll = currentScroll;
  });
}

/* ============================================
   COPY TO CLIPBOARD
   ============================================ */
window.copyToClipboard = async (text, button) => {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};

/* ============================================
   TABS
   ============================================ */
document.querySelectorAll('[data-tabs]').forEach(tabContainer => {
  const tabs = tabContainer.querySelectorAll('[data-tab]');
  const panels = tabContainer.querySelectorAll('[data-panel]');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;
      
      // Update tabs
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      // Update panels
      panels.forEach(panel => {
        if (panel.dataset.panel === targetId) {
          panel.classList.remove('hidden');
        } else {
          panel.classList.add('hidden');
        }
      });
    });
  });
});

/* ============================================
   ACCORDION
   ============================================ */
document.querySelectorAll('.accordion-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const item = trigger.closest('.accordion-item');
    const content = item.querySelector('.accordion-content');
    const isOpen = item.classList.contains('open');
    
    // Close all others (optional - remove for multi-open)
    document.querySelectorAll('.accordion-item.open').forEach(openItem => {
      if (openItem !== item) {
        openItem.classList.remove('open');
        openItem.querySelector('.accordion-content').style.maxHeight = '0';
      }
    });
    
    // Toggle current
    if (isOpen) {
      item.classList.remove('open');
      content.style.maxHeight = '0';
    } else {
      item.classList.add('open');
      content.style.maxHeight = content.scrollHeight + 'px';
    }
  });
});

/* ============================================
   COUNTER ANIMATION
   Animates numbers when they come into view
   ============================================ */
function initCounterAnimation() {
  // Find all elements that should be animated
  const counterSelectors = [
    '.hero-stat-value',
    '.stat-number',
    '.stat-value',
    '[data-count]'
  ];
  
  const counters = document.querySelectorAll(counterSelectors.join(', '));
  
  if (counters.length === 0) return;
  
  // Parse the target value from text
  function parseValue(text) {
    const cleaned = text.replace(/[^0-9.KMB+$%-]/gi, '');
    let value = 0;
    let suffix = '';
    let prefix = '';
    let decimals = 0;
    
    // Extract prefix ($, +, etc.)
    const prefixMatch = text.match(/^([+$]*)/);
    if (prefixMatch) prefix = prefixMatch[1];
    
    // Extract suffix (K, M, B, +, %, etc.)
    const suffixMatch = text.match(/([KMB+%]*)$/i);
    if (suffixMatch) suffix = suffixMatch[1];
    
    // Extract the number
    const numMatch = cleaned.match(/[\d.]+/);
    if (numMatch) {
      value = parseFloat(numMatch[0]);
      // Check for decimals
      if (numMatch[0].includes('.')) {
        decimals = numMatch[0].split('.')[1].length;
      }
    }
    
    return { value, suffix, prefix, decimals };
  }
  
  // Format number with commas
  function formatNumber(num, decimals = 0) {
    if (decimals > 0) {
      return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  // Easing function for smooth animation
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  
  // Animate a single counter
  function animateCounter(element) {
    if (element.dataset.animated === 'true') return;
    
    const originalText = element.textContent.trim();
    const { value, suffix, prefix, decimals } = parseValue(originalText);
    
    if (value === 0) return;
    
    element.dataset.animated = 'true';
    
    const duration = 2000; // 2 seconds
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const currentValue = value * easedProgress;
      
      element.textContent = prefix + formatNumber(currentValue, decimals) + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        // Ensure final value is exact
        element.textContent = originalText;
      }
    }
    
    // Start from 0
    element.textContent = prefix + '0' + suffix;
    requestAnimationFrame(updateCounter);
  }
  
  // Use Intersection Observer to trigger animation when visible
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.2
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Small delay for visual effect
        setTimeout(() => {
          animateCounter(entry.target);
        }, 100);
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  // Observe all counter elements
  counters.forEach(counter => {
    // Store original value
    counter.dataset.originalValue = counter.textContent.trim();
    observer.observe(counter);
  });
}

// Initialize counter animation when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCounterAnimation);
} else {
  initCounterAnimation();
}

// Also trigger after splash screen if present
const originalTriggerPageAnimations = typeof triggerPageAnimations === 'function' ? triggerPageAnimations : null;
if (originalTriggerPageAnimations) {
  window.triggerPageAnimations = function() {
    originalTriggerPageAnimations();
    // Re-initialize counters after page animations
    setTimeout(initCounterAnimation, 100);
  };
}

/* ============================================
   TRIAL BANNER & PAYWALL SYSTEM
   ============================================ */

// Global access state
window.CreditHopperAccess = {
  status: null,
  
  // Initialize access status
  async init() {
    if (typeof API === 'undefined' || !API.token) return;
    
    try {
      const response = await API.dashboard.getAccess();
      if (response.ok && response.data.data) {
        this.status = response.data.data.access;
        this.renderTrialBanner();
        return this.status;
      }
    } catch (err) {
      console.error('Failed to get access status:', err);
    }
    return null;
  },
  
  // Check if user has full access
  hasFullAccess() {
    return this.status?.hasFullAccess === true;
  },
  
  // Render trial banner if applicable
  renderTrialBanner() {
    if (!this.status) return;
    
    // Remove any existing banner
    const existingBanner = document.querySelector('.trial-banner');
    if (existingBanner) existingBanner.remove();
    
    // Don't show banner for paid users
    if (this.status.accessLevel === 'PAID') return;
    
    const banner = document.createElement('div');
    banner.className = 'trial-banner';
    
    if (this.status.accessLevel === 'TRIAL') {
      const daysLeft = this.status.trialDaysLeft;
      const urgency = daysLeft <= 2 ? 'urgent' : daysLeft <= 5 ? 'warning' : '';
      
      banner.className += ` trial-banner-${urgency || 'info'}`;
      banner.innerHTML = `
        <div class="trial-banner-content">
          <span class="trial-banner-icon">⏰</span>
          <span class="trial-banner-text">
            ${daysLeft <= 1 ? 'Trial ends today!' : `${daysLeft} days left in your free trial`}
          </span>
          <a href="/checkout.html" class="trial-banner-cta">Subscribe Now</a>
          <button class="trial-banner-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
      `;
    } else if (this.status.accessLevel === 'EXPIRED') {
      banner.className += ' trial-banner-expired';
      banner.innerHTML = `
        <div class="trial-banner-content">
          <span class="trial-banner-icon">🔒</span>
          <span class="trial-banner-text">
            Your free trial has ended. Subscribe to continue using all features.
          </span>
          <a href="/checkout.html" class="trial-banner-cta">Subscribe for $49/mo</a>
        </div>
      `;
    }
    
    // Insert at top of main content
    const main = document.querySelector('main') || document.body;
    main.insertBefore(banner, main.firstChild);
  },
  
  // Show paywall modal
  showPaywall(featureName = 'This feature') {
    // Remove existing modal
    const existing = document.querySelector('.paywall-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.className = 'paywall-modal';
    modal.innerHTML = `
      <div class="paywall-backdrop" onclick="window.CreditHopperAccess.hidePaywall()"></div>
      <div class="paywall-content">
        <button class="paywall-close" onclick="window.CreditHopperAccess.hidePaywall()">×</button>
        <div class="paywall-icon">🔒</div>
        <h2 class="paywall-title">Subscription Required</h2>
        <p class="paywall-message">
          ${featureName} requires an active subscription. 
          ${this.status?.accessLevel === 'EXPIRED' 
            ? 'Your free trial has ended.' 
            : 'Upgrade now to unlock all features.'}
        </p>
        <div class="paywall-features">
          <div class="paywall-feature">✓ Unlimited AI letter generation</div>
          <div class="paywall-feature">✓ Credit report analysis</div>
          <div class="paywall-feature">✓ Dispute tracking & management</div>
          <div class="paywall-feature">✓ Progress dashboard</div>
        </div>
        <div class="paywall-price">
          <span class="paywall-amount">$49</span>
          <span class="paywall-period">/month</span>
        </div>
        <a href="/checkout.html" class="paywall-cta">Subscribe Now</a>
        <p class="paywall-guarantee">30-day money-back guarantee</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    // Focus trap
    setTimeout(() => {
      modal.querySelector('.paywall-cta').focus();
    }, 100);
  },
  
  hidePaywall() {
    const modal = document.querySelector('.paywall-modal');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
  },
  
  // Handle 402 (payment required) responses
  handlePaymentRequired(response) {
    if (response.status === 402) {
      const featureName = response.data?.error?.replace(' requires an active subscription', '') || 'This feature';
      this.showPaywall(featureName);
      return true;
    }
    return false;
  }
};

// Add trial banner styles dynamically
const trialStyles = document.createElement('style');
trialStyles.textContent = `
  .trial-banner {
    position: sticky;
    top: 0;
    z-index: 1000;
    padding: 12px 20px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
  }
  .trial-banner-info {
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    color: white;
  }
  .trial-banner-warning {
    background: linear-gradient(135deg, #f59e0b, #ef4444);
    color: white;
  }
  .trial-banner-urgent {
    background: #ef4444;
    color: white;
    animation: pulse-bg 2s infinite;
  }
  .trial-banner-expired {
    background: #1f2937;
    color: white;
  }
  @keyframes pulse-bg {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.85; }
  }
  .trial-banner-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .trial-banner-cta {
    background: white;
    color: #1f2937;
    padding: 6px 16px;
    border-radius: 6px;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.2s;
  }
  .trial-banner-cta:hover {
    transform: scale(1.05);
  }
  .trial-banner-close {
    background: transparent;
    border: none;
    color: white;
    font-size: 20px;
    cursor: pointer;
    opacity: 0.7;
    margin-left: 8px;
  }
  .trial-banner-close:hover {
    opacity: 1;
  }
  
  /* Paywall Modal */
  .paywall-modal {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .paywall-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
  }
  .paywall-content {
    position: relative;
    background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 16px;
    padding: 40px;
    max-width: 420px;
    width: 90%;
    text-align: center;
    color: white;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
  }
  .paywall-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: transparent;
    border: none;
    color: #9ca3af;
    font-size: 24px;
    cursor: pointer;
  }
  .paywall-close:hover { color: white; }
  .paywall-icon { font-size: 48px; margin-bottom: 16px; }
  .paywall-title {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .paywall-message {
    color: #9ca3af;
    margin-bottom: 24px;
    line-height: 1.6;
  }
  .paywall-features {
    text-align: left;
    margin-bottom: 24px;
  }
  .paywall-feature {
    padding: 8px 0;
    color: #d1d5db;
    border-bottom: 1px solid rgba(255,255,255,0.05);
  }
  .paywall-feature:last-child { border: none; }
  .paywall-price {
    margin-bottom: 20px;
  }
  .paywall-amount {
    font-size: 36px;
    font-weight: 700;
    background: linear-gradient(135deg, #34d399, #06b6d4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  .paywall-period { color: #9ca3af; }
  .paywall-cta {
    display: inline-block;
    background: linear-gradient(135deg, #34d399, #06b6d4);
    color: #111827;
    padding: 14px 32px;
    border-radius: 8px;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .paywall-cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(52,211,153,0.3);
  }
  .paywall-guarantee {
    margin-top: 16px;
    font-size: 12px;
    color: #6b7280;
  }
`;
document.head.appendChild(trialStyles);

// Initialize access check on protected pages
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Only init on dashboard/engine pages
    if (window.location.pathname.match(/dashboard|engine|settings|my-letters/)) {
      window.CreditHopperAccess.init();
    }
  });
} else {
  if (window.location.pathname.match(/dashboard|engine|settings|my-letters/)) {
    window.CreditHopperAccess.init();
  }
}

console.log('CreditHopper JS initialized');
