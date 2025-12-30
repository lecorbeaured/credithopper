/* ============================================
   CREDITHOPPER - GLOBAL AUTH UI MANAGER
   Handles auth state display across ALL pages
   ============================================ */

const AuthUI = {
  // ============================================
  // STATE
  // ============================================
  
  /**
   * Check if user is logged in
   * Uses both token and logged_in flag for reliability
   */
  isLoggedIn() {
    const hasToken = !!localStorage.getItem('ch_token');
    const hasFlag = localStorage.getItem('credithopper_logged_in') === 'true';
    return hasToken && hasFlag;
  },
  
  /**
   * Get current user info
   */
  getUser() {
    try {
      const userData = localStorage.getItem('ch_user');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  },
  
  /**
   * Get user's display name
   */
  getUserDisplayName() {
    const user = this.getUser();
    if (user?.firstName) {
      return user.firstName;
    }
    const email = localStorage.getItem('credithopper_user_email');
    if (email) {
      return email.split('@')[0];
    }
    return 'User';
  },
  
  /**
   * Get user's initials for avatar
   */
  getUserInitials() {
    const user = this.getUser();
    if (user?.firstName && user?.lastName) {
      return (user.firstName[0] + user.lastName[0]).toUpperCase();
    }
    const name = this.getUserDisplayName();
    return name.substring(0, 2).toUpperCase();
  },

  // ============================================
  // LOGOUT
  // ============================================
  
  /**
   * Log the user out
   */
  logout() {
    // Clear all auth data
    localStorage.removeItem('ch_token');
    localStorage.removeItem('ch_user');
    localStorage.removeItem('credithopper_logged_in');
    localStorage.removeItem('credithopper_user_email');
    
    // Redirect to home or login
    window.location.href = '/login.html';
  },

  // ============================================
  // UI RENDERING
  // ============================================
  
  /**
   * Generate logged-in nav HTML
   */
  getLoggedInNavHTML() {
    const initials = this.getUserInitials();
    const name = this.getUserDisplayName();
    
    return `
      <a href="dashboard.html" class="btn btn-ghost">
        <i data-lucide="layout-dashboard" style="width: 16px; height: 16px; margin-right: 6px;"></i>
        Dashboard
      </a>
      <div class="nav-user-menu">
        <button class="nav-user-btn" id="navUserBtn" onclick="AuthUI.toggleUserMenu()">
          <span class="nav-user-avatar">${initials}</span>
          <span class="nav-user-name">${name}</span>
          <i data-lucide="chevron-down" style="width: 14px; height: 14px;"></i>
        </button>
        <div class="nav-user-dropdown" id="navUserDropdown">
          <a href="dashboard.html" class="nav-dropdown-item">
            <i data-lucide="layout-dashboard"></i>
            Dashboard
          </a>
          <a href="settings.html" class="nav-dropdown-item">
            <i data-lucide="settings"></i>
            Settings
          </a>
          <a href="help.html" class="nav-dropdown-item">
            <i data-lucide="help-circle"></i>
            Help Center
          </a>
          <div class="nav-dropdown-divider"></div>
          <a href="#" class="nav-dropdown-item nav-logout" onclick="AuthUI.logout(); return false;">
            <i data-lucide="log-out"></i>
            Sign Out
          </a>
        </div>
      </div>
    `;
  },
  
  /**
   * Generate logged-out nav HTML
   */
  getLoggedOutNavHTML() {
    return `
      <a href="login.html" class="btn btn-ghost">Login</a>
      <a href="register.html" class="btn btn-primary">Get Started</a>
    `;
  },
  
  /**
   * Generate mobile menu auth section
   */
  getMobileAuthHTML() {
    if (this.isLoggedIn()) {
      return `
        <a href="dashboard.html" class="btn btn-primary" style="width: 100%;">
          <i data-lucide="layout-dashboard" style="width: 16px; height: 16px; margin-right: 6px;"></i>
          Go to Dashboard
        </a>
        <a href="#" class="btn btn-outline" style="width: 100%;" onclick="AuthUI.logout(); return false;">
          Sign Out
        </a>
      `;
    }
    return `
      <a href="login.html" class="btn btn-outline" style="width: 100%;">Login</a>
      <a href="register.html" class="btn btn-primary" style="width: 100%;">Get Started</a>
    `;
  },
  
  /**
   * Toggle user dropdown menu
   */
  toggleUserMenu() {
    const dropdown = document.getElementById('navUserDropdown');
    if (dropdown) {
      dropdown.classList.toggle('open');
    }
  },
  
  /**
   * Close dropdown when clicking outside
   */
  handleClickOutside(e) {
    const dropdown = document.getElementById('navUserDropdown');
    const btn = document.getElementById('navUserBtn');
    
    if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
      dropdown.classList.remove('open');
    }
  },

  // ============================================
  // INITIALIZATION
  // ============================================
  
  /**
   * Update navigation based on auth state
   */
  updateNav() {
    // Find nav-actions container (desktop nav)
    const navActions = document.querySelector('.nav-actions');
    if (navActions) {
      navActions.innerHTML = this.isLoggedIn() 
        ? this.getLoggedInNavHTML() 
        : this.getLoggedOutNavHTML();
    }
    
    // Find mobile menu actions
    const mobileActions = document.querySelector('.mobile-menu-actions');
    if (mobileActions) {
      mobileActions.innerHTML = this.getMobileAuthHTML();
    }
    
    // Reinitialize Lucide icons
    if (window.lucide) {
      lucide.createIcons();
    }
  },
  
  /**
   * Initialize auth UI on page load
   * Call this on every page
   */
  init() {
    // Skip on dashboard/settings pages (they have their own auth UI)
    // Skip on login/register pages (user is authenticating)
    const path = window.location.pathname;
    const skipPages = ['dashboard', 'settings', 'my-letters', 'login', 'register', 'forgot-password'];
    
    if (skipPages.some(page => path.includes(page))) {
      console.log('[AuthUI] Skipping - page has custom auth UI or is auth page');
      return;
    }
    
    // Update navigation
    this.updateNav();
    
    // Add click-outside listener for dropdown
    document.addEventListener('click', (e) => this.handleClickOutside(e));
    
    console.log('[AuthUI] Initialized, logged in:', this.isLoggedIn());
  }
};

// ============================================
// STYLES
// ============================================

const authUIStyles = document.createElement('style');
authUIStyles.textContent = `
  /* Nav User Menu */
  .nav-user-menu {
    position: relative;
  }
  
  .nav-user-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: var(--dark-800, #1f2937);
    border: 1px solid var(--dark-700, #374151);
    border-radius: 100px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .nav-user-btn:hover {
    background: var(--dark-700, #374151);
    border-color: var(--dark-600, #4b5563);
  }
  
  .nav-user-avatar {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #10b981, #06b6d4);
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    color: white;
  }
  
  .nav-user-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--dark-100, #f3f4f6);
  }
  
  /* User Dropdown */
  .nav-user-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    min-width: 200px;
    background: var(--dark-800, #1f2937);
    border: 1px solid var(--dark-700, #374151);
    border-radius: 12px;
    padding: 8px;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.2s ease;
    z-index: 1000;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  }
  
  .nav-user-dropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
  
  .nav-dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    color: var(--dark-200, #e5e7eb);
    text-decoration: none;
    font-size: 14px;
    transition: background 0.15s ease;
  }
  
  .nav-dropdown-item:hover {
    background: var(--dark-700, #374151);
  }
  
  .nav-dropdown-item i {
    width: 16px;
    height: 16px;
    opacity: 0.7;
  }
  
  .nav-dropdown-divider {
    height: 1px;
    background: var(--dark-700, #374151);
    margin: 8px 0;
  }
  
  .nav-logout {
    color: #ef4444;
  }
  
  .nav-logout:hover {
    background: rgba(239, 68, 68, 0.1);
  }
  
  /* Mobile adjustments */
  @media (max-width: 768px) {
    .nav-user-name {
      display: none;
    }
  }
`;
document.head.appendChild(authUIStyles);

// ============================================
// AUTO-INITIALIZE
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AuthUI.init());
} else {
  AuthUI.init();
}

// Make available globally
window.AuthUI = AuthUI;

console.log('[AuthUI] Auth UI manager loaded');
