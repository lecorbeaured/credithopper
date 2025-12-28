/* ============================================
   CREDITHOPPER - DASHBOARD JS
   Fetches real data from API and populates UI
   ============================================ */

const Dashboard = {
  // State
  data: null,
  user: null,
  access: null,
  
  // ===========================================
  // INITIALIZATION
  // ===========================================
  
  async init() {
    console.log('Dashboard initializing...');
    
    // Check authentication
    if (!API.auth.isLoggedIn()) {
      window.location.href = 'login.html';
      return;
    }
    
    // Initialize UI components
    this.initSidebar();
    this.initUserMenu();
    this.initCurrentDate();
    this.initPrepAlert();
    
    // Load dashboard data
    await this.loadData();
    
    // Bind events
    this.bindEvents();
    
    // Initialize icons
    if (window.lucide) lucide.createIcons();
    
    console.log('Dashboard initialized');
  },
  
  // ===========================================
  // DATA LOADING
  // ===========================================
  
  async loadData() {
    this.showLoading();
    
    try {
      const response = await API.dashboard.get();
      
      if (!response.ok) {
        this.showError('Failed to load dashboard data');
        return;
      }
      
      const { dashboard, access, user } = response.data.data;
      
      this.data = dashboard;
      this.access = access;
      this.user = user;
      
      // Populate all sections
      this.populateUser();
      this.populateAccess();
      this.populateStats();
      this.populateOnboarding();
      this.populateDisputes();
      this.populateWins();
      this.populateQuickActions();
      this.populateActivity();
      
    } catch (error) {
      console.error('Dashboard load error:', error);
      this.showError('Something went wrong. Please refresh.');
    } finally {
      this.hideLoading();
    }
  },
  
  // ===========================================
  // USER INFO
  // ===========================================
  
  populateUser() {
    if (!this.user) return;
    
    const { firstName, lastName, email } = this.user;
    
    // Welcome message
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome back, ${firstName}! 👋`;
    }
    
    // Sidebar user info
    const avatarEl = document.getElementById('userAvatar');
    const nameEl = document.getElementById('userName');
    const emailEl = document.getElementById('userEmail');
    
    if (avatarEl) {
      avatarEl.textContent = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    }
    if (nameEl) {
      nameEl.textContent = `${firstName} ${lastName}`;
    }
    if (emailEl) {
      emailEl.textContent = email;
    }
  },
  
  // ===========================================
  // ACCESS/SUBSCRIPTION
  // ===========================================
  
  populateAccess() {
    if (!this.access) return;
    
    const upgradeCard = document.getElementById('sidebarUpgrade');
    const upgradeTitle = document.getElementById('upgradeTitle');
    const upgradeText = document.getElementById('upgradeText');
    
    if (!upgradeCard) return;
    
    if (this.access.hasFullAccess) {
      if (this.access.reason === 'trial') {
        // Show trial countdown
        upgradeCard.style.display = 'block';
        if (upgradeTitle) {
          upgradeTitle.textContent = `Trial: ${this.access.trialDaysLeft} days left`;
        }
        if (upgradeText) {
          upgradeText.textContent = 'Upgrade to keep generating letters';
        }
      } else {
        // Paid user - hide upgrade card
        upgradeCard.style.display = 'none';
      }
    } else {
      // Trial expired or no access
      upgradeCard.style.display = 'block';
      if (upgradeTitle) {
        upgradeTitle.textContent = 'Upgrade Required';
      }
      if (upgradeText) {
        upgradeText.textContent = 'Subscribe to generate letters and dispute';
      }
    }
  },
  
  // ===========================================
  // STATS CARDS
  // ===========================================
  
  populateStats() {
    if (!this.data) return;
    
    const { items, disputes, wins } = this.data;
    
    // Debt Eliminated
    const debtEl = document.getElementById('statDebtEliminated');
    const debtChangeEl = document.getElementById('statDebtChange');
    if (debtEl) {
      debtEl.textContent = this.formatCurrency(wins?.totalDebtEliminated || 0);
    }
    if (debtChangeEl) {
      const change = debtChangeEl.querySelector('span');
      if (change) {
        change.textContent = wins?.total > 0 ? `${wins.total} items removed` : 'Start disputing';
      }
    }
    
    // Items on Report
    const itemsEl = document.getElementById('statItemsTotal');
    const itemsChangeEl = document.getElementById('statItemsChange');
    if (itemsEl) {
      itemsEl.textContent = items?.total || 0;
    }
    if (itemsChangeEl) {
      const change = itemsChangeEl.querySelector('span');
      if (change) {
        change.textContent = `${items?.active || 0} active, ${items?.deleted || 0} deleted`;
      }
    }
    
    // Success Rate
    const successEl = document.getElementById('statSuccessRate');
    const successChangeEl = document.getElementById('statSuccessChange');
    if (successEl) {
      successEl.textContent = `${wins?.successRate || 0}%`;
    }
    if (successChangeEl) {
      const change = successChangeEl.querySelector('span');
      if (change && wins?.successRate > 0) {
        change.textContent = `${wins.fullDeletions} full deletions`;
      } else if (change) {
        change.textContent = 'No disputes completed';
      }
    }
    
    // Letters Sent
    const mailedEl = document.getElementById('statDisputesMailed');
    const mailedChangeEl = document.getElementById('statDisputesChange');
    if (mailedEl) {
      mailedEl.textContent = disputes?.mailed || 0;
    }
    if (mailedChangeEl) {
      const change = mailedChangeEl.querySelector('span');
      if (change) {
        const overdue = disputes?.overdue || 0;
        if (overdue > 0) {
          change.textContent = `${overdue} overdue response${overdue > 1 ? 's' : ''}`;
          mailedChangeEl.className = 'stat-change warning';
        } else {
          change.textContent = `${disputes?.drafts || 0} pending`;
        }
      }
    }
  },
  
  // ===========================================
  // ONBOARDING CHECKLIST
  // ===========================================
  
  populateOnboarding() {
    if (!this.data?.onboarding) return;
    
    const { onboarding } = this.data;
    const card = document.getElementById('onboardingCard');
    const stepsContainer = document.getElementById('onboardingSteps');
    const progressEl = document.getElementById('onboardingProgress');
    const progressBar = document.getElementById('onboardingProgressBar');
    
    // Hide if complete or mostly complete
    if (!card || onboarding.isComplete || onboarding.percentComplete >= 80) {
      if (card) card.style.display = 'none';
      return;
    }
    
    // Show onboarding
    card.style.display = 'block';
    
    // Update progress
    if (progressEl) {
      progressEl.textContent = `${onboarding.percentComplete}%`;
    }
    if (progressBar) {
      progressBar.style.width = `${onboarding.percentComplete}%`;
    }
    
    // Render steps
    if (stepsContainer && onboarding.steps) {
      stepsContainer.innerHTML = onboarding.steps.map(step => `
        <a href="${step.link}" class="onboarding-step" style="
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: ${step.completed ? 'rgba(52, 211, 153, 0.1)' : 'var(--dark-800)'};
          border: 1px solid ${step.completed ? 'rgba(52, 211, 153, 0.3)' : 'var(--dark-700)'};
          border-radius: 10px;
          text-decoration: none;
          transition: all 0.2s;
        ">
          <div style="
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: ${step.completed ? 'var(--accent-400)' : 'var(--dark-600)'};
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          ">
            ${step.completed 
              ? '<i data-lucide="check" style="width: 14px; height: 14px; color: #000;"></i>'
              : '<span style="width: 8px; height: 8px; border-radius: 50%; background: var(--dark-400);"></span>'
            }
          </div>
          <div style="flex: 1;">
            <div style="color: ${step.completed ? 'var(--accent-400)' : '#fff'}; font-size: 0.875rem; font-weight: 500;">
              ${step.label}
            </div>
            <div style="color: var(--dark-400); font-size: 0.75rem;">
              ${step.description}
            </div>
          </div>
          ${!step.completed ? '<i data-lucide="chevron-right" style="width: 16px; height: 16px; color: var(--dark-500);"></i>' : ''}
        </a>
      `).join('');
      
      // Refresh icons
      if (window.lucide) lucide.createIcons();
    }
  },
  
  // ===========================================
  // DISPUTES LIST
  // ===========================================
  
  populateDisputes() {
    const container = document.getElementById('disputesList');
    const emptyState = document.getElementById('disputesEmpty');
    
    if (!container) return;
    
    const attention = this.data?.attention;
    const hasDisputes = attention?.overdueDisputes?.length > 0 || 
                        attention?.upcomingDeadlines?.length > 0 ||
                        attention?.readyToAdvance?.length > 0;
    
    if (!hasDisputes) {
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    const disputes = [];
    
    if (attention.overdueDisputes) {
      attention.overdueDisputes.forEach(d => {
        disputes.push({
          ...d,
          statusType: 'warning',
          statusIcon: 'alert-circle',
          tag: 'Overdue',
          tagClass: 'warning',
        });
      });
    }
    
    if (attention.upcomingDeadlines) {
      attention.upcomingDeadlines.forEach(d => {
        disputes.push({
          ...d,
          statusType: 'pending',
          statusIcon: 'clock',
          tag: 'Pending',
          tagClass: 'pending',
        });
      });
    }
    
    if (attention.readyToAdvance) {
      attention.readyToAdvance.forEach(d => {
        disputes.push({
          ...d,
          statusType: 'in-progress',
          statusIcon: 'arrow-up-circle',
          tag: 'Ready to Escalate',
          tagClass: 'in-progress',
        });
      });
    }
    
    container.innerHTML = disputes.slice(0, 5).map(dispute => `
      <div class="dispute-item" onclick="window.location.href='my-letters.html'">
        <div class="dispute-status ${dispute.statusType}">
          <i data-lucide="${dispute.statusIcon}"></i>
        </div>
        <div class="dispute-info">
          <h4>${dispute.negativeItem?.creditorName || 'Unknown'}</h4>
          <p>${this.formatAccountType(dispute.negativeItem?.accountType)} • ${dispute.bureau || dispute.target}</p>
        </div>
        <div class="dispute-meta">
          <span class="dispute-date">${this.formatDate(dispute.responseDueDate || dispute.mailedAt)}</span>
          <span class="dispute-tag ${dispute.tagClass}">${dispute.tag}</span>
        </div>
      </div>
    `).join('');
    
    if (window.lucide) lucide.createIcons();
  },
  
  // ===========================================
  // WINS TRACKER
  // ===========================================
  
  populateWins() {
    if (!this.data?.wins) return;
    
    const { wins, items, disputes } = this.data;
    
    const totalEl = document.getElementById('winsTotal');
    if (totalEl) {
      totalEl.textContent = wins.total || 0;
    }
    
    const progressEl = document.getElementById('winsProgress');
    if (progressEl && items?.total > 0) {
      const progress = Math.round((wins.total / items.total) * 100);
      progressEl.style.setProperty('--progress', Math.min(progress, 100));
    }
    
    const debtEl = document.getElementById('winsDebtEliminated');
    if (debtEl) {
      debtEl.textContent = this.formatCurrency(wins.totalDebtEliminated || 0);
    }
    
    const disputedEl = document.getElementById('winsTotalDisputed');
    if (disputedEl) {
      disputedEl.textContent = disputes?.total || 0;
    }
    
    this.populateWinsChart(wins.monthlyWins);
  },
  
  populateWinsChart(monthlyData) {
    const chartEl = document.getElementById('winsChart');
    const labelsEl = document.getElementById('winsChartLabels');
    
    if (!chartEl || !labelsEl) return;
    
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: d.toISOString().substring(0, 7),
        label: d.toLocaleString('default', { month: 'short' }),
      });
    }
    
    const counts = months.map(m => monthlyData?.[m.key]?.count || 0);
    const maxCount = Math.max(...counts, 1);
    
    chartEl.innerHTML = counts.map((count, i) => `
      <div class="chart-bar${i === 5 ? ' current' : ''}" style="--height: ${(count / maxCount) * 100}%">
        <span>${count}</span>
      </div>
    `).join('');
    
    labelsEl.innerHTML = months.map(m => `<span>${m.label}</span>`).join('');
  },
  
  // ===========================================
  // QUICK ACTIONS
  // ===========================================
  
  populateQuickActions() {
    if (!this.data?.quickActions) return;
    
    const container = document.getElementById('quickActions');
    if (!container) return;
    
    const actions = this.data.quickActions;
    
    if (actions.length > 0) {
      container.innerHTML = actions.slice(0, 4).map(action => `
        <a href="${action.link}" class="quick-action ${action.variant === 'warning' ? 'warning' : ''}">
          <div class="action-icon ${action.variant || ''}">
            ${this.getActionIcon(action.icon)}
          </div>
          <span>${action.label}</span>
          ${action.count ? `<span class="action-badge">${action.count}</span>` : ''}
        </a>
      `).join('');
      
      if (window.lucide) lucide.createIcons();
    }
  },
  
  getActionIcon(emoji) {
    const iconMap = {
      '📄': '<i data-lucide="file-text"></i>',
      '⚠️': '<i data-lucide="alert-triangle"></i>',
      '📬': '<i data-lucide="mail"></i>',
      '📈': '<i data-lucide="trending-up"></i>',
      '✍️': '<i data-lucide="edit-3"></i>',
      '🔄': '<i data-lucide="refresh-cw"></i>',
    };
    return iconMap[emoji] || '<i data-lucide="zap"></i>';
  },
  
  // ===========================================
  // ACTIVITY TIMELINE
  // ===========================================
  
  populateActivity() {
    if (!this.data?.recentActivity) return;
    
    const container = document.getElementById('activityTimeline');
    const emptyEl = document.getElementById('activityEmpty');
    
    if (!container) return;
    
    const activities = this.data.recentActivity;
    
    if (!activities || activities.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    
    container.innerHTML = activities.map(activity => `
      <div class="activity-item">
        <div class="activity-icon ${activity.color || 'default'}">
          <span style="font-size: 1rem;">${activity.icon || '📌'}</span>
        </div>
        <div class="activity-content">
          <p>${activity.description}</p>
          <span class="activity-time">${this.formatTimeAgo(activity.createdAt)}</span>
        </div>
      </div>
    `).join('');
  },
  
  async loadMoreActivity() {
    const response = await API.dashboard.getActivity(50);
    if (response.ok) {
      this.data.recentActivity = response.data.data.activity;
      this.populateActivity();
      this.showToast('Activity loaded', 'info');
    }
  },
  
  // ===========================================
  // UI HELPERS
  // ===========================================
  
  showLoading() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.classList.add('loading');
    }
  },
  
  hideLoading() {
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
      statsGrid.classList.remove('loading');
    }
  },
  
  showError(message) {
    this.showToast(message, 'error');
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
  // FORMATTING HELPERS
  // ===========================================
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  },
  
  formatDate(dateStr) {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },
  
  formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${diffDays >= 14 ? 's' : ''} ago`;
    
    return this.formatDate(dateStr);
  },
  
  formatAccountType(type) {
    const types = {
      COLLECTION: 'Collection',
      CHARGE_OFF: 'Charge-off',
      LATE_PAYMENT: 'Late Payment',
      MEDICAL: 'Medical',
      CREDIT_CARD: 'Credit Card',
      AUTO_LOAN: 'Auto Loan',
      PERSONAL_LOAN: 'Personal Loan',
      STUDENT_LOAN: 'Student Loan',
      MORTGAGE: 'Mortgage',
      REPOSSESSION: 'Repossession',
      FORECLOSURE: 'Foreclosure',
      BANKRUPTCY: 'Bankruptcy',
      JUDGMENT: 'Judgment',
      TAX_LIEN: 'Tax Lien',
      INQUIRY: 'Inquiry',
    };
    return types[type] || type || 'Account';
  },
  
  // ===========================================
  // UI COMPONENTS
  // ===========================================
  
  initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggle = document.getElementById('sidebarToggle');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (!toggle || !sidebar) return;
    
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });
    
    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
    
    sidebar.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          sidebar.classList.remove('open');
          if (overlay) overlay.classList.remove('active');
        }
      });
    });
  },
  
  initUserMenu() {
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('userDropdown');
      const btn = document.getElementById('userMenuBtn');
      
      if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('active');
      }
    });
  },
  
  initCurrentDate() {
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
  },
  
  initPrepAlert() {
    const alert = document.getElementById('prepAlert');
    if (!alert) return;
    
    const dismissed = localStorage.getItem('prepAlertDismissed');
    const completed = localStorage.getItem('prepStepsCompleted');
    
    if (dismissed === 'true' || completed === 'true') {
      alert.style.display = 'none';
    }
  },
  
  bindEvents() {
    window.addEventListener('resize', () => {
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('sidebarOverlay');
      
      if (window.innerWidth > 768 && sidebar) {
        sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
      }
    });
  },
};

// ===========================================
// GLOBAL FUNCTIONS
// ===========================================

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    dropdown.classList.toggle('active');
    if (window.lucide) lucide.createIcons();
  }
}

function dismissPrepAlert() {
  const alert = document.getElementById('prepAlert');
  if (alert) {
    alert.style.display = 'none';
    localStorage.setItem('prepAlertDismissed', 'true');
  }
}

function handleLogout(e) {
  e.preventDefault();
  API.auth.logout();
}

// Make functions globally available
window.toggleUserMenu = toggleUserMenu;
window.dismissPrepAlert = dismissPrepAlert;
window.handleLogout = handleLogout;
window.Dashboard = Dashboard;

// ===========================================
// INITIALIZE ON DOM READY
// ===========================================

document.addEventListener('DOMContentLoaded', () => Dashboard.init());

// Add animation keyframes and styles
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
  
  .stats-grid.loading .stat-card {
    opacity: 0.5;
    pointer-events: none;
  }
  
  .action-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #ef4444;
    color: white;
    font-size: 0.625rem;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
  }
  
  .quick-action {
    position: relative;
  }
  
  .quick-action.warning .action-icon {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  .dispute-item {
    cursor: pointer;
    transition: background 0.2s;
  }
  
  .dispute-item:hover {
    background: var(--dark-750);
  }
  
  .dispute-tag.warning {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  .activity-icon.warning {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
  }
  
  .onboarding-step:hover {
    background: var(--dark-750) !important;
    border-color: var(--dark-600) !important;
  }
`;
document.head.appendChild(style);

console.log('CreditHopper Dashboard JS loaded');
