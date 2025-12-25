/* ============================================
   CREDITHOPPER - HELP CENTER JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFaqAccordion();
  initHelpSearch();
  initSmoothScroll();
  initKeyboardShortcuts();
});

/* ============================================
   FAQ ACCORDION
   ============================================ */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  
  if (!faqItems.length) {
    console.log('No FAQ items found');
    return;
  }
  
  console.log('Found', faqItems.length, 'FAQ items');
  
  faqItems.forEach((item, index) => {
    const question = item.querySelector('.faq-question');
    
    if (!question) {
      console.log('No question button found for item', index);
      return;
    }
    
    question.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isActive = item.classList.contains('active');
      
      // Toggle current item
      if (isActive) {
        item.classList.remove('active');
      } else {
        item.classList.add('active');
      }
      
      console.log('FAQ toggled:', index, 'active:', !isActive);
    });
  });
  
  // Open first item in each section by default
  document.querySelectorAll('.help-section').forEach(section => {
    const firstItem = section.querySelector('.faq-item');
    if (firstItem) {
      firstItem.classList.add('active');
    }
  });
  
  console.log('FAQ accordion initialized');
}

/* ============================================
   HELP SEARCH
   ============================================ */
function initHelpSearch() {
  const searchInput = document.getElementById('helpSearch');
  if (!searchInput) return;
  
  let debounceTimer;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    
    debounceTimer = setTimeout(() => {
      const query = e.target.value.toLowerCase().trim();
      filterFaqItems(query);
    }, 200);
  });
  
  // Clear search on escape
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      filterFaqItems('');
      searchInput.blur();
    }
  });
}

function filterFaqItems(query) {
  const faqItems = document.querySelectorAll('.faq-item');
  const sections = document.querySelectorAll('.help-section');
  
  if (!query) {
    // Show all items
    faqItems.forEach(item => {
      item.style.display = '';
      item.classList.remove('search-match');
    });
    sections.forEach(section => {
      section.style.display = '';
    });
    return;
  }
  
  // Filter items
  faqItems.forEach(item => {
    const questionText = item.querySelector('.faq-question span').textContent.toLowerCase();
    const answerText = item.querySelector('.faq-answer').textContent.toLowerCase();
    
    const matches = questionText.includes(query) || answerText.includes(query);
    
    if (matches) {
      item.style.display = '';
      item.classList.add('active'); // Open matching items
      item.classList.add('search-match');
    } else {
      item.style.display = 'none';
      item.classList.remove('search-match');
    }
  });
  
  // Hide sections with no visible items
  sections.forEach(section => {
    const visibleItems = section.querySelectorAll('.faq-item:not([style*="display: none"])');
    section.style.display = visibleItems.length ? '' : 'none';
  });
  
  // Show message if no results
  showNoResultsMessage(document.querySelectorAll('.faq-item.search-match').length === 0 && query);
}

function showNoResultsMessage(show) {
  let noResults = document.getElementById('noSearchResults');
  
  if (show && !noResults) {
    noResults = document.createElement('div');
    noResults.id = 'noSearchResults';
    noResults.className = 'no-results-message';
    noResults.innerHTML = `
      <div class="no-results-icon">
        <i data-lucide="search-x"></i>
      </div>
      <h3>No results found</h3>
      <p>Try different keywords or browse the categories above</p>
    `;
    noResults.style.cssText = `
      text-align: center;
      padding: 3rem;
      color: var(--dark-400);
    `;
    
    const helpContent = document.querySelector('.help-content .container');
    if (helpContent) {
      helpContent.appendChild(noResults);
      lucide.createIcons();
    }
  } else if (!show && noResults) {
    noResults.remove();
  }
}

/* ============================================
   SMOOTH SCROLL
   ============================================ */
function initSmoothScroll() {
  const categoryLinks = document.querySelectorAll('.category-card, a[href^="#"]');
  
  categoryLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      
      e.preventDefault();
      
      const targetId = href.substring(1);
      const targetSection = document.getElementById(targetId);
      
      if (targetSection) {
        const offsetTop = targetSection.offsetTop - 80;
        
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
        
        // Update URL without jumping
        history.pushState(null, null, href);
      }
    });
  });
}

/* ============================================
   KEYBOARD SHORTCUTS
   ============================================ */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to focus search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('helpSearch');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }
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

/* ============================================
   SCROLL TO TOP ON CATEGORY CLICK
   ============================================ */
document.querySelectorAll('.category-card').forEach(card => {
  card.addEventListener('click', () => {
    // Small delay to allow smooth scroll to complete
    setTimeout(() => {
      const searchInput = document.getElementById('helpSearch');
      if (searchInput) {
        searchInput.value = '';
        filterFaqItems('');
      }
    }, 100);
  });
});

console.log('CreditHopper Help JS initialized');
