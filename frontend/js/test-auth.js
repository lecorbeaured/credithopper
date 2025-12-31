/* ============================================
   CREDITHOPPER - TEST LOGIN SYSTEM
   For testing the frontend without a backend
   
   USAGE:
   1. Include this script on login.html
   2. Use these test credentials:
      - Email: test@example.com
      - Password: password123
   3. Or click "Test Login" button that appears
   
   REMOVE THIS FILE IN PRODUCTION!
   ============================================ */

const TestAuth = {
  // Test user credentials
  TEST_USERS: [
    {
      email: 'test@example.com',
      password: 'password123',
      user: {
        id: 'test-user-001',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        createdAt: '2024-01-15T00:00:00Z',
        subscription: {
          status: 'TRIAL',
          trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      },
      token: 'test-jwt-token-' + Date.now()
    },
    {
      email: 'pro@example.com',
      password: 'password123',
      user: {
        id: 'pro-user-001',
        email: 'pro@example.com',
        firstName: 'Pro',
        lastName: 'Member',
        createdAt: '2023-06-01T00:00:00Z',
        subscription: {
          status: 'ACTIVE',
          plan: 'PRO'
        }
      },
      token: 'test-jwt-token-pro-' + Date.now()
    }
  ],

  /**
   * Attempt test login
   */
  login(email, password) {
    const user = this.TEST_USERS.find(
      u => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );
    
    if (user) {
      return {
        ok: true,
        data: {
          success: true,
          data: {
            user: user.user,
            token: user.token
          }
        }
      };
    }
    
    return {
      ok: false,
      data: {
        success: false,
        error: 'Invalid email or password'
      }
    };
  },

  /**
   * Quick login (bypasses form)
   */
  quickLogin(userIndex = 0) {
    const testUser = this.TEST_USERS[userIndex];
    
    // Store auth data
    localStorage.setItem('ch_token', testUser.token);
    localStorage.setItem('ch_user', JSON.stringify(testUser.user));
    localStorage.setItem('credithopper_logged_in', 'true');
    localStorage.setItem('credithopper_user_email', testUser.email);
    
    console.log('[TestAuth] Quick login as:', testUser.user.firstName);
    
    // Show success and redirect
    if (typeof showToast === 'function') {
      showToast('Test login successful! Redirecting...', 'success');
    }
    
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 500);
  },

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem('ch_token');
    localStorage.removeItem('ch_user');
    localStorage.removeItem('credithopper_logged_in');
    localStorage.removeItem('credithopper_user_email');
    
    console.log('[TestAuth] Logged out');
    window.location.href = 'login.html';
  },

  /**
   * Check if using test auth
   */
  isTestMode() {
    const token = localStorage.getItem('ch_token');
    return token && token.startsWith('test-jwt-token');
  },

  /**
   * Add test login UI to page
   */
  addTestUI() {
    // Only show login panel on login/register pages
    const isAuthPage = window.location.pathname.includes('login') || 
                       window.location.pathname.includes('register');
    
    if (!isAuthPage) {
      // On other pages, just show indicator if in test mode
      if (this.isTestMode()) {
        this.addTestModeIndicator();
      }
      return;
    }

    // Create test login panel
    const panel = document.createElement('div');
    panel.id = 'testAuthPanel';
    panel.innerHTML = `
      <div class="test-auth-header">
        <span>🧪 Test Mode</span>
        <button onclick="document.getElementById('testAuthPanel').classList.toggle('collapsed')">
          <i data-lucide="chevron-down"></i>
        </button>
      </div>
      <div class="test-auth-body">
        <p>Use these credentials or click a button:</p>
        <div class="test-credentials">
          <div class="test-cred-row">
            <strong>Trial User:</strong>
            <code>test@example.com</code> / <code>password123</code>
          </div>
          <div class="test-cred-row">
            <strong>Pro User:</strong>
            <code>pro@example.com</code> / <code>password123</code>
          </div>
        </div>
        <div class="test-auth-buttons">
          <button class="test-btn test-btn-trial" onclick="TestAuth.quickLogin(0)">
            Quick Login (Trial)
          </button>
          <button class="test-btn test-btn-pro" onclick="TestAuth.quickLogin(1)">
            Quick Login (Pro)
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    
    // Initialize icons if available
    if (window.lucide) lucide.createIcons();
  },

  /**
   * Intercept API calls for testing
   */
  interceptAPI() {
    // Store original API if exists
    if (typeof API !== 'undefined' && API.auth) {
      const originalLogin = API.auth.login;
      
      // Override login to try test auth first if backend fails
      API.auth.login = async (email, password, remember) => {
        try {
          // Try real API first
          const result = await originalLogin.call(API.auth, email, password, remember);
          if (result.ok) return result;
          
          // If failed, try test auth
          console.log('[TestAuth] Backend failed, trying test credentials...');
          const testResult = TestAuth.login(email, password);
          
          if (testResult.ok) {
            // Store test auth data
            API.setToken(testResult.data.data.token);
            API.setUser(testResult.data.data.user);
            return testResult;
          }
          
          return result; // Return original error
        } catch (error) {
          // Network error - use test auth
          console.log('[TestAuth] Network error, using test auth...');
          const testResult = TestAuth.login(email, password);
          
          if (testResult.ok) {
            API.setToken(testResult.data.data.token);
            API.setUser(testResult.data.data.user);
          }
          
          return testResult;
        }
      };
      
      console.log('[TestAuth] API interceptor installed');
    }
  },

  /**
   * Initialize test auth system
   */
  init() {
    console.log('[TestAuth] Initializing test authentication system...');
    console.log('[TestAuth] ⚠️  REMOVE THIS IN PRODUCTION!');
    
    // Add test UI (handles both panel and indicator)
    this.addTestUI();
    
    // Intercept API (only on auth pages)
    if (window.location.pathname.includes('login') || 
        window.location.pathname.includes('register')) {
      this.interceptAPI();
    }
  },

  /**
   * Add indicator showing test mode is active
   */
  addTestModeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'test-mode-indicator';
    indicator.innerHTML = '🧪 Test Mode Active';
    indicator.onclick = () => {
      if (confirm('Log out of test mode?')) {
        this.logout();
      }
    };
    document.body.appendChild(indicator);
  }
};

// ============================================
// STYLES
// ============================================

const testAuthStyles = document.createElement('style');
testAuthStyles.textContent = `
  #testAuthPanel {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 320px;
    background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
    border: 2px solid #3b82f6;
    border-radius: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    z-index: 99999;
    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    overflow: hidden;
    transition: all 0.3s ease;
  }
  
  #testAuthPanel.collapsed .test-auth-body {
    display: none;
  }
  
  .test-auth-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(59, 130, 246, 0.2);
    border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  }
  
  .test-auth-header span {
    font-weight: 600;
    color: #60a5fa;
    font-size: 14px;
  }
  
  .test-auth-header button {
    background: transparent;
    border: none;
    color: #60a5fa;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
  }
  
  .test-auth-header button:hover {
    color: #93c5fd;
  }
  
  .test-auth-body {
    padding: 16px;
  }
  
  .test-auth-body p {
    color: #94a3b8;
    font-size: 13px;
    margin: 0 0 12px 0;
  }
  
  .test-credentials {
    background: rgba(0,0,0,0.3);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 16px;
  }
  
  .test-cred-row {
    font-size: 12px;
    color: #cbd5e1;
    margin-bottom: 8px;
  }
  
  .test-cred-row:last-child {
    margin-bottom: 0;
  }
  
  .test-cred-row strong {
    display: block;
    color: #e2e8f0;
    margin-bottom: 2px;
  }
  
  .test-cred-row code {
    background: rgba(59, 130, 246, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    color: #93c5fd;
  }
  
  .test-auth-buttons {
    display: flex;
    gap: 8px;
  }
  
  .test-btn {
    flex: 1;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .test-btn-trial {
    background: linear-gradient(135deg, #10b981, #059669);
    color: white;
  }
  
  .test-btn-trial:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
  }
  
  .test-btn-pro {
    background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    color: white;
  }
  
  .test-btn-pro:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }
  
  /* Test mode indicator */
  .test-mode-indicator {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #f59e0b, #d97706);
    color: white;
    padding: 8px 16px;
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    z-index: 99999;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
    animation: pulse-test 2s infinite;
  }
  
  .test-mode-indicator:hover {
    background: linear-gradient(135deg, #d97706, #b45309);
  }
  
  @keyframes pulse-test {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  /* Responsive */
  @media (max-width: 480px) {
    #testAuthPanel {
      bottom: 10px;
      right: 10px;
      left: 10px;
      width: auto;
    }
  }
`;
document.head.appendChild(testAuthStyles);

// ============================================
// AUTO-INITIALIZE
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => TestAuth.init());
} else {
  TestAuth.init();
}

// Make available globally
window.TestAuth = TestAuth;

console.log('[TestAuth] Test authentication module loaded');
console.log('[TestAuth] Test credentials:');
console.log('  Trial: test@example.com / password123');
console.log('  Pro: pro@example.com / password123');
