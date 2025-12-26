/* ============================================
   CREDITHOPPER - DASHBOARD JS
   Section 6: User Dashboard functionality
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initSidebar();
  initCurrentDate();
  initScoreCircle();
  initNotifications();
  initUserMenu();
  initPrepAlert();
});

/* ============================================
   PREP STEPS ALERT
   ============================================ */
function initPrepAlert() {
  const alert = document.getElementById('prepAlert');
  if (!alert) return;
  
  // Check if user has dismissed or completed prep steps
  const dismissed = localStorage.getItem('prepAlertDismissed');
  const completed = localStorage.getItem('prepStepsCompleted');
  
  if (dismissed === 'true' || completed === 'true') {
    alert.style.display = 'none';
  }
}

function dismissPrepAlert() {
  const alert = document.getElementById('prepAlert');
  if (alert) {
    alert.style.display = 'none';
    localStorage.setItem('prepAlertDismissed', 'true');
  }
}

// Make globally available
window.dismissPrepAlert = dismissPrepAlert;

/* ============================================
   USER MENU DROPDOWN
   ============================================ */
function initUserMenu() {
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const btn = document.getElementById('userMenuBtn');
    
    if (dropdown && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
    if (window.lucide) lucide.createIcons();
  }
}

// Make it globally available
window.toggleUserMenu = toggleUserMenu;

/* ============================================
   SIDEBAR
   ============================================ */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (!toggle || !sidebar) return;
  
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  
  // Close on overlay click
  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
  
  // Close on nav item click (mobile)
  sidebar.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      }
    });
  });
}

/* ============================================
   CURRENT DATE
   ============================================ */
function initCurrentDate() {
  const dateEl = document.getElementById('currentDate');
  if (!dateEl) return;
  
  const options = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  
  const today = new Date().toLocaleDateString('en-US', options);
  dateEl.textContent = today;
}

/* ============================================
   SCORE CIRCLE
   ============================================ */
function initScoreCircle() {
  const scoreCircle = document.querySelector('.score-circle svg');
  if (!scoreCircle) return;
  
  // Add gradient definition
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
  `;
  scoreCircle.insertBefore(defs, scoreCircle.firstChild);
  
  // Animate score on load
  const progress = scoreCircle.querySelector('.score-progress');
  if (progress) {
    progress.style.strokeDashoffset = '339.3';
    
    setTimeout(() => {
      progress.style.transition = 'stroke-dashoffset 1.5s ease-out';
      progress.style.strokeDashoffset = `calc(339.3 - (339.3 * 72 / 100))`;
    }, 300);
  }
  
  // Bureau selector
  const bureauSelect = document.querySelector('.score-bureau-select');
  if (bureauSelect) {
    bureauSelect.addEventListener('change', (e) => {
      // Simulate different scores for different bureaus
      const scores = {
        'Equifax': { score: 687, progress: 72 },
        'Experian': { score: 691, progress: 73 },
        'TransUnion': { score: 679, progress: 70 }
      };
      
      const selected = scores[e.target.value] || scores['Equifax'];
      
      // Update score display
      const scoreNumber = document.querySelector('.score-number');
      if (scoreNumber) {
        animateNumber(scoreNumber, parseInt(scoreNumber.textContent), selected.score);
      }
      
      // Update progress circle
      if (progress) {
        progress.style.strokeDashoffset = `calc(339.3 - (339.3 * ${selected.progress} / 100))`;
      }
      
      // Update marker
      const marker = document.querySelector('.range-marker');
      if (marker) {
        marker.style.left = `${selected.progress}%`;
      }
    });
  }
}

function animateNumber(element, start, end, duration = 500) {
  const range = end - start;
  const startTime = performance.now();
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    const current = Math.round(start + (range * easeOutQuad(progress)));
    element.textContent = current;
    
    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }
  
  requestAnimationFrame(update);
}

function easeOutQuad(t) {
  return t * (2 - t);
}

/* ============================================
   NOTIFICATIONS
   ============================================ */
function initNotifications() {
  const notificationBtn = document.querySelector('.notification-btn');
  if (!notificationBtn) return;
  
  notificationBtn.addEventListener('click', () => {
    showToast('No new notifications', 'info');
    
    // Remove notification dot
    const dot = notificationBtn.querySelector('.notification-dot');
    if (dot) {
      dot.style.display = 'none';
    }
  });
}

/* ============================================
   USER MENU
   ============================================ */
const userMenuBtn = document.getElementById('userMenuBtn');
if (userMenuBtn) {
  userMenuBtn.addEventListener('click', () => {
    // In a real app, this would toggle a dropdown menu
    showToast('User menu coming soon!', 'info');
  });
}

/* ============================================
   DISPUTE ACTIONS
   ============================================ */
document.querySelectorAll('.dispute-item').forEach(item => {
  item.addEventListener('click', () => {
    const title = item.querySelector('h4').textContent;
    showToast(`Opening dispute: ${title}`, 'info');
  });
});

/* ============================================
   QUICK ACTIONS
   ============================================ */
document.querySelectorAll('.quick-action').forEach(action => {
  action.addEventListener('click', (e) => {
    // Allow navigation for actual links
    if (action.getAttribute('href') && 
        action.getAttribute('href') !== '#') {
      return;
    }
    
    e.preventDefault();
    const actionName = action.querySelector('span').textContent;
    
    if (actionName === 'Download All') {
      showToast('Preparing download...', 'info');
      setTimeout(() => {
        showToast('All letters downloaded!', 'success');
      }, 1500);
    } else if (actionName === 'Get Help') {
      showToast('Opening help center...', 'info');
    }
  });
});

/* ============================================
   TOAST NOTIFICATION
   ============================================ */
function showToast(message, type = 'default') {
  let container = document.getElementById('toast-container');
  
  if (!container) {
    container = document.createElement('div');
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
  }
  
  const colors = {
    success: '#059669',
    error: '#dc2626',
    info: '#6366f1',
    default: '#374151'
  };
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 0.875rem 1.25rem;
    background: ${colors[type] || colors.default};
    color: white;
    border-radius: 10px;
    font-size: 0.875rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
    max-width: 300px;
  `;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add animation keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
document.head.appendChild(style);

/* ============================================
   CHART INTERACTIONS
   ============================================ */
document.querySelectorAll('.chart-bar').forEach(bar => {
  bar.addEventListener('mouseenter', () => {
    const span = bar.querySelector('span');
    if (span) {
      span.style.opacity = '1';
    }
  });
  
  bar.addEventListener('mouseleave', () => {
    const span = bar.querySelector('span');
    if (span) {
      span.style.opacity = '0';
    }
  });
});

/* ============================================
   RESPONSIVE CHECK
   ============================================ */
function checkResponsive() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (window.innerWidth > 768) {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  }
}

window.addEventListener('resize', checkResponsive);

/* ============================================
   LOGOUT HANDLER
   ============================================ */
function handleLogout(e) {
  e.preventDefault();
  
  // Clear all auth-related localStorage items
  localStorage.removeItem('credithopper_logged_in');
  localStorage.removeItem('credithopper_user_email');
  localStorage.removeItem('credithopper_user_name');
  localStorage.removeItem('credithopper_is_trial');
  
  // Redirect to home page
  window.location.href = 'index.html';
}

// Make globally available
window.handleLogout = handleLogout;

console.log('CreditHopper Dashboard JS initialized');
