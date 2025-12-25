/* ============================================
   CREDITHOPPER - LEGAL PAGES JS
   Privacy Policy & Terms of Service
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initTableOfContents();
  initSmoothScroll();
});

/* ============================================
   TABLE OF CONTENTS - Active State Tracking
   ============================================ */
function initTableOfContents() {
  const tocLinks = document.querySelectorAll('.legal-toc nav a');
  const sections = document.querySelectorAll('.legal-article section[id]');
  
  if (!tocLinks.length || !sections.length) return;
  
  // Create intersection observer
  const observerOptions = {
    rootMargin: '-100px 0px -70% 0px',
    threshold: 0
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Remove active class from all links
        tocLinks.forEach(link => link.classList.remove('active'));
        
        // Add active class to corresponding link
        const activeLink = document.querySelector(`.legal-toc nav a[href="#${entry.target.id}"]`);
        if (activeLink) {
          activeLink.classList.add('active');
        }
      }
    });
  }, observerOptions);
  
  // Observe all sections
  sections.forEach(section => observer.observe(section));
  
  // Set initial active state
  if (tocLinks.length > 0) {
    tocLinks[0].classList.add('active');
  }
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */
function initSmoothScroll() {
  const tocLinks = document.querySelectorAll('.legal-toc nav a');
  
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      const targetId = link.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        const offsetTop = targetSection.offsetTop - 80;
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
        
        // Update URL without jumping
        history.pushState(null, null, `#${targetId}`);
      }
    });
  });
}

/* ============================================
   MOBILE MENU
   ============================================ */
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn && navLinks) {
  mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    
    // Toggle icon
    const icon = mobileMenuBtn.querySelector('i');
    if (navLinks.classList.contains('active')) {
      icon.setAttribute('data-lucide', 'x');
    } else {
      icon.setAttribute('data-lucide', 'menu');
    }
    lucide.createIcons();
  });
}

console.log('CreditHopper Legal JS initialized');
