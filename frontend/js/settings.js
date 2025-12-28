/* ============================================
   CREDITHOPPER - SETTINGS JS
   Account Settings & User Management
   ============================================ */

const Settings = {
  // ===========================================
  // STATE
  // ===========================================
  state: {
    user: null,
    subscription: null,
    loading: false,
  },

  // ===========================================
  // INITIALIZATION
  // ===========================================
  
  async init() {
    console.log('Settings initializing...');
    
    // Check auth
    if (!API.auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    
    // Initialize UI components
    this.initTabs();
    this.initSidebar();
    this.initForms();
    this.initModals();
    
    // Load user data
    await this.loadUserData();
    
    // Check URL hash for specific tab
    this.handleHashNavigation();
    
    // Initialize icons
    if (window.lucide) lucide.createIcons();
    
    console.log('Settings initialized');
  },

  // ===========================================
  // DATA LOADING
  // ===========================================
  
  async loadUserData() {
    try {
      // Get user from localStorage first
      const storedUser = localStorage.getItem('ch_user');
      if (storedUser) {
        this.state.user = JSON.parse(storedUser);
        this.populateProfileForm();
      }
      
      // Fetch fresh user data
      const response = await API.auth.me();
      if (response.ok && response.data.data?.user) {
        this.state.user = response.data.data.user;
        localStorage.setItem('ch_user', JSON.stringify(this.state.user));
        this.populateProfileForm();
        this.updateSubscriptionDisplay();
        this.updateUserDisplay();
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  },
  
  populateProfileForm() {
    const user = this.state.user;
    if (!user) return;
    
    // Profile form
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    
    if (firstNameInput) firstNameInput.value = user.firstName || '';
    if (lastNameInput) lastNameInput.value = user.lastName || '';
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || '';
    
    // Mailing address
    const streetInput = document.getElementById('street');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const zipInput = document.getElementById('zip');
    
    if (streetInput) streetInput.value = user.street || '';
    if (cityInput) cityInput.value = user.city || '';
    if (stateInput) stateInput.value = user.state || '';
    if (zipInput) zipInput.value = user.zip || '';
  },
  
  updateUserDisplay() {
    const user = this.state.user;
    if (!user) return;
    
    // Update sidebar user info
    const userName = document.querySelector('.user-info-name');
    const userEmail = document.querySelector('.user-info-email');
    
    if (userName) {
      userName.textContent = user.firstName 
        ? `${user.firstName} ${user.lastName || ''}`.trim() 
        : user.email;
    }
    if (userEmail) {
      userEmail.textContent = user.email;
    }
  },
  
  updateSubscriptionDisplay() {
    const user = this.state.user;
    if (!user) return;
    
    // Update plan name
    const planName = document.getElementById('planName');
    const planPrice = document.getElementById('planPrice');
    const planBadge = document.getElementById('planBadge');
    
    const planDisplayNames = {
      FREE: { name: 'Free Plan', price: '$0/month' },
      PRO: { name: 'Pro Plan', price: '$49/month' },
    };
    
    const plan = planDisplayNames[user.subscriptionTier] || planDisplayNames.FREE;
    
    if (planName) planName.textContent = plan.name;
    if (planPrice) planPrice.textContent = plan.price;
    if (planBadge) {
      planBadge.textContent = user.subscriptionTier === 'FREE' ? 'Free' : 'Active';
      planBadge.className = `subscription-badge ${user.subscriptionTier === 'FREE' ? 'free' : 'active'}`;
    }
    
    // Update member since
    const memberSince = document.getElementById('memberSince');
    if (memberSince && user.createdAt) {
      memberSince.textContent = this.formatDate(user.createdAt);
    }
    
    // Show/hide cancel section based on plan
    const cancelSection = document.getElementById('cancelSection');
    if (cancelSection) {
      cancelSection.style.display = user.subscriptionTier === 'FREE' ? 'none' : 'block';
    }
    
    // Update upgrade button visibility
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
      upgradeBtn.style.display = user.subscriptionTier === 'FREE' ? 'flex' : 'none';
    }
  },

  // ===========================================
  // PROFILE UPDATES
  // ===========================================
  
  async updateProfile(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Saving...';
    if (window.lucide) lucide.createIcons();
    
    try {
      const data = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        phone: document.getElementById('phone').value,
        street: document.getElementById('street')?.value || null,
        city: document.getElementById('city')?.value || null,
        state: document.getElementById('state')?.value || null,
        zip: document.getElementById('zip')?.value || null,
      };
      
      const response = await API.auth.updateProfile(data);
      
      if (response.ok) {
        // Update local state
        this.state.user = { ...this.state.user, ...data };
        localStorage.setItem('ch_user', JSON.stringify(this.state.user));
        this.updateUserDisplay();
        
        this.showToast('Profile updated successfully!', 'success');
      } else {
        throw new Error(response.data?.error || 'Failed to update profile');
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      if (window.lucide) lucide.createIcons();
    }
  },

  // ===========================================
  // PASSWORD CHANGE
  // ===========================================
  
  async changePassword(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (newPassword !== confirmPassword) {
      this.showToast('New passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 8) {
      this.showToast('Password must be at least 8 characters', 'error');
      return;
    }
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Updating...';
    if (window.lucide) lucide.createIcons();
    
    try {
      const response = await API.auth.changePassword(currentPassword, newPassword);
      
      if (response.ok) {
        this.showToast('Password updated successfully!', 'success');
        form.reset();
      } else {
        throw new Error(response.data?.error || 'Failed to update password');
      }
    } catch (error) {
      this.showToast(error.message, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
      if (window.lucide) lucide.createIcons();
    }
  },

  // ===========================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================
  
  async cancelSubscription() {
    const confirmCheckbox = document.getElementById('cancelConfirm');
    if (!confirmCheckbox?.checked) {
      this.showToast('Please confirm you understand the cancellation terms', 'error');
      return;
    }
    
    try {
      // In production, this would call Stripe to cancel
      const response = await fetch(`${API.baseURL}/billing/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API.auth.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Show success regardless (mock for now)
      const modalBody = document.getElementById('cancelModalBody');
      const modalFooter = document.getElementById('cancelModalFooter');
      
      modalBody.innerHTML = `
        <div class="cancel-success">
          <div class="cancel-success-icon">
            <i data-lucide="check"></i>
          </div>
          <h4 class="cancel-confirm-title">Subscription Cancelled</h4>
          <p class="cancel-confirm-text">Your subscription has been cancelled. You'll retain access until your current billing period ends.</p>
          <p style="color: var(--dark-400); font-size: 0.875rem; margin-top: 1rem;">
            Changed your mind? You can resubscribe anytime from the <a href="checkout.html?plan=pro" style="color: var(--accent-400);">pricing page</a>.
          </p>
        </div>
      `;
      
      modalFooter.innerHTML = `
        <button class="btn btn-primary" onclick="Settings.closeModal('cancelModal'); location.reload();">Done</button>
      `;
      
      if (window.lucide) lucide.createIcons();
      
    } catch (error) {
      this.showToast('Failed to cancel subscription', 'error');
    }
  },

  // ===========================================
  // DELETE ACCOUNT
  // ===========================================
  
  async deleteAccount() {
    const confirmInput = document.getElementById('deleteConfirmInput').value;
    
    if (confirmInput !== 'DELETE') {
      this.showToast('Please type DELETE to confirm', 'error');
      return;
    }
    
    try {
      const response = await fetch(`${API.baseURL}/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${API.auth.getToken()}`,
          'Content-Type': 'application/json',
        },
      });
      
      // Clear local storage
      localStorage.removeItem('ch_token');
      localStorage.removeItem('ch_user');
      
      this.showToast('Account deleted successfully', 'info');
      
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
      
    } catch (error) {
      this.showToast('Failed to delete account', 'error');
    }
  },

  // ===========================================
  // LOGOUT
  // ===========================================
  
  logout() {
    API.auth.logout();
    window.location.href = 'login.html';
  },

  // ===========================================
  // UI HELPERS
  // ===========================================
  
  initTabs() {
    document.querySelectorAll('.settings-nav-item').forEach(tab => {
      tab.addEventListener('click', () => {
        // Update active tab
        document.querySelectorAll('.settings-nav-item').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding section
        const tabId = tab.dataset.tab;
        document.querySelectorAll('.settings-section').forEach(section => {
          section.classList.remove('active');
        });
        document.getElementById(tabId)?.classList.add('active');
        
        // Update URL hash
        window.location.hash = tabId;
      });
    });
  },
  
  handleHashNavigation() {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const tab = document.querySelector(`.settings-nav-item[data-tab="${hash}"]`);
      if (tab) tab.click();
    }
  },
  
  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (toggle && sidebar) {
      toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
      });
    }
    
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  },
  
  initForms() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
      profileForm.addEventListener('submit', (e) => this.updateProfile(e));
    }
    
    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', (e) => this.changePassword(e));
    }
    
    // Logout buttons
    document.querySelectorAll('[data-action="logout"]').forEach(btn => {
      btn.addEventListener('click', () => this.logout());
    });
  },
  
  initModals() {
    // Close modals on escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active').forEach(m => {
          m.classList.remove('active');
        });
        document.body.style.overflow = '';
      }
    });
    
    // Close on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  },
  
  openModal(modalId) {
    document.getElementById(modalId)?.classList.add('active');
    document.body.style.overflow = 'hidden';
  },
  
  closeModal(modalId) {
    document.getElementById(modalId)?.classList.remove('active');
    document.body.style.overflow = '';
  },
  
  showToast(message, type = 'default') {
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
      warning: '#f59e0b',
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
  },

  // ===========================================
  // UTILITIES
  // ===========================================
  
  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  },
};

// Make globally available
window.Settings = Settings;

// Expose modal functions globally for onclick handlers
window.openModal = (id) => Settings.openModal(id);
window.closeModal = (id) => Settings.closeModal(id);
window.confirmCancel = () => Settings.cancelSubscription();
window.deleteAccount = () => Settings.deleteAccount();

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => Settings.init());

// Add spin animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  .subscription-badge.free {
    background: var(--dark-700);
    color: var(--dark-400);
  }
`;
document.head.appendChild(style);

console.log('CreditHopper Settings loaded');
