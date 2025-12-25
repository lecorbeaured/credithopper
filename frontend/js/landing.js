/* ============================================
   CREDITHOPPER - LANDING PAGE JS
   Section 2: Landing page interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initLandingAnimations();
  initMobileMenu();
  initNavScroll();
  initAccordion();
  initSmoothScroll();
  initCounterAnimations();
});

/* ============================================
   LANDING ANIMATIONS
   ============================================ */
function initLandingAnimations() {
  // Animate elements on load with stagger
  const loadElements = document.querySelectorAll('.animate-on-load');
  loadElements.forEach((el, index) => {
    setTimeout(() => {
      el.classList.add('animated');
    }, 100 + (index * 100));
  });

  // Intersection Observer for scroll animations
  const observerOptions = {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  };

  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        scrollObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    scrollObserver.observe(el);
  });
}

/* ============================================
   MOBILE MENU
   ============================================ */
function initMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const menu = document.getElementById('mobileMenu');
  
  if (!toggle || !menu) return;
  
  const menuIcon = toggle.querySelector('.menu-icon');
  const closeIcon = toggle.querySelector('.close-icon');
  
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('active');
    
    if (menuIcon && closeIcon) {
      menuIcon.classList.toggle('hidden', isOpen);
      closeIcon.classList.toggle('hidden', !isOpen);
    }
    
    toggle.setAttribute('aria-expanded', isOpen);
  });

  // Close menu when clicking a link
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('active');
      if (menuIcon && closeIcon) {
        menuIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
      }
    });
  });

  // Close menu on escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('active')) {
      menu.classList.remove('active');
      if (menuIcon && closeIcon) {
        menuIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
      }
    }
  });
}

/* ============================================
   NAV SCROLL EFFECT
   ============================================ */
function initNavScroll() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  
  let lastScroll = 0;
  let ticking = false;
  
  const updateNav = () => {
    const currentScroll = window.pageYOffset;
    
    // Add/remove scrolled class
    if (currentScroll > 50) {
      nav.classList.add('nav-scrolled');
    } else {
      nav.classList.remove('nav-scrolled');
    }
    
    // Hide/show nav on scroll (optional - can be enabled)
    // if (currentScroll > lastScroll && currentScroll > 100) {
    //   nav.classList.add('nav-hidden');
    // } else {
    //   nav.classList.remove('nav-hidden');
    // }
    
    lastScroll = currentScroll;
    ticking = false;
  };
  
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(updateNav);
      ticking = true;
    }
  });

  // Add styles for nav states
  const style = document.createElement('style');
  style.textContent = `
    .nav-scrolled {
      background: rgba(13, 13, 15, 0.95) !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    }
    .nav-hidden {
      transform: translateY(-100%);
    }
  `;
  document.head.appendChild(style);
}

/* ============================================
   ACCORDION
   ============================================ */
function initAccordion() {
  const items = document.querySelectorAll('.accordion-item');
  
  items.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    const content = item.querySelector('.accordion-content');
    
    if (!trigger || !content) return;
    
    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      
      // Close all other items
      items.forEach(otherItem => {
        if (otherItem !== item && otherItem.classList.contains('open')) {
          otherItem.classList.remove('open');
          const otherContent = otherItem.querySelector('.accordion-content');
          if (otherContent) {
            otherContent.style.maxHeight = '0';
          }
        }
      });
      
      // Toggle current item
      if (isOpen) {
        item.classList.remove('open');
        content.style.maxHeight = '0';
      } else {
        item.classList.add('open');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        
        const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ============================================
   COUNTER ANIMATION (for stats)
   Enhanced version that handles K, M, %, $ formats
   ============================================ */
function animateCounter(element, duration = 2000) {
  const originalText = element.textContent.trim();
  
  // Parse the value and format
  function parseValue(text) {
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
    const numMatch = text.replace(/[^0-9.]/g, '').match(/[\d.]+/);
    if (numMatch) {
      value = parseFloat(numMatch[0]);
      if (numMatch[0].includes('.')) {
        decimals = numMatch[0].split('.')[1].length;
      }
    }
    
    return { value, suffix, prefix, decimals };
  }
  
  function formatNumber(num, decimals = 0) {
    if (decimals > 0) {
      return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  
  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }
  
  const { value, suffix, prefix, decimals } = parseValue(originalText);
  if (value === 0) return;
  
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeOutExpo(progress);
    const currentValue = value * easedProgress;
    
    element.textContent = prefix + formatNumber(currentValue, decimals) + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = originalText;
    }
  }
  
  element.textContent = prefix + '0' + suffix;
  requestAnimationFrame(update);
}

// Animate counters when they come into view
function initCounterAnimations() {
  const selectors = [
    '.hero-stat-value',
    '.stat-number', 
    '.stat-value',
    '[data-counter]'
  ];
  
  const counters = document.querySelectorAll(selectors.join(', '));
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && entry.target.dataset.animated !== 'true') {
        entry.target.dataset.animated = 'true';
        setTimeout(() => animateCounter(entry.target), 100);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  
  counters.forEach(counter => observer.observe(counter));
}

/* ============================================
   FORM HANDLING (for future use)
   ============================================ */
window.handleNewsletterSubmit = (form) => {
  const email = form.querySelector('input[type="email"]');
  const button = form.querySelector('button');
  
  if (!email || !email.value) return false;
  
  // Set loading state
  const originalText = button.textContent;
  button.textContent = 'Subscribing...';
  button.disabled = true;
  
  // Simulate API call
  setTimeout(() => {
    button.textContent = 'Subscribed!';
    email.value = '';
    
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);
  }, 1000);
  
  return false;
};

console.log('CreditHopper Landing JS initialized');
