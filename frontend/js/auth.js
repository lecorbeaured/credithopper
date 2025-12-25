/* ============================================
   CREDITHOPPER - AUTH PAGE JS
   Section 5: Login, Register, Forgot Password
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  handleGoogleCallback(); // Check for OAuth callback first
  initLoginForm();
  initRegisterForm();
  initForgotPasswordForm();
  initPasswordStrength();
  initGoogleAuth();
});

/* ============================================
   GOOGLE OAUTH CALLBACK HANDLER
   ============================================ */
function handleGoogleCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  const googleSuccess = urlParams.get('google');
  const error = urlParams.get('error');
  
  // Handle errors from Google OAuth
  if (error) {
    let errorMessage = 'Google sign-in failed. Please try again.';
    if (error === 'google_denied') {
      errorMessage = 'You denied access to your Google account.';
    } else if (error === 'no_code') {
      errorMessage = 'No authorization code received from Google.';
    }
    showToast(errorMessage, 'error');
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname);
    return;
  }
  
  // Handle successful Google OAuth
  if (token && googleSuccess === 'success') {
    // Store the token
    localStorage.setItem('credithopper_logged_in', 'true');
    localStorage.setItem('ch_token', token);
    
    // Also set for API if available
    if (typeof API !== 'undefined') {
      API.setToken(token);
    }
    
    showToast('Successfully signed in with Google!', 'success');
    
    // Clean up URL and redirect
    window.history.replaceState({}, document.title, window.location.pathname);
    
    // Check for stored redirect
    const storedRedirect = sessionStorage.getItem('credithopper_redirect');
    let redirectUrl = 'dashboard.html';
    
    if (storedRedirect) {
      redirectUrl = storedRedirect;
      sessionStorage.removeItem('credithopper_redirect');
    }
    
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000);
  }
}

/* ============================================
   GOOGLE AUTH
   ============================================ */
function initGoogleAuth() {
  // Find all Google sign-in buttons
  const googleButtons = document.querySelectorAll('.btn-social');
  
  googleButtons.forEach(btn => {
    // Check if it's a Google button (has Google SVG or text)
    const btnText = btn.textContent.toLowerCase();
    if (btnText.includes('google')) {
      btn.addEventListener('click', handleGoogleSignIn);
    }
  });
}

async function handleGoogleSignIn(e) {
  e.preventDefault();
  
  const btn = e.currentTarget;
  const originalContent = btn.innerHTML;
  
  // Show loading state
  btn.innerHTML = '<span class="btn-loading"></span> Connecting to Google...';
  btn.disabled = true;
  
  try {
    // Check if we have API integration
    if (typeof API !== 'undefined' && API.baseUrl) {
      // Real implementation - redirect to backend OAuth endpoint
      // The backend will handle the OAuth flow and redirect back
      window.location.href = `${API.baseUrl}/auth/google`;
      return;
    }
    
    // Demo mode - simulate Google sign-in
    await simulateApiCall(2000);
    
    // Simulate successful Google auth
    const mockUser = {
      email: 'demo.user@gmail.com',
      firstName: 'Demo',
      lastName: 'User',
      provider: 'google'
    };
    
    // Store auth state
    localStorage.setItem('credithopper_logged_in', 'true');
    localStorage.setItem('credithopper_user_email', mockUser.email);
    localStorage.setItem('credithopper_user', JSON.stringify(mockUser));
    
    // Show success
    showToast('Successfully signed in with Google!', 'success');
    
    // Redirect
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    const storedRedirect = sessionStorage.getItem('credithopper_redirect');
    
    let redirectUrl = 'dashboard.html';
    if (redirectParam === 'engine') {
      redirectUrl = 'engine.html';
    } else if (storedRedirect) {
      redirectUrl = storedRedirect;
      sessionStorage.removeItem('credithopper_redirect');
    }
    
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000);
    
  } catch (error) {
    console.error('Google sign-in error:', error);
    showToast('Google sign-in failed. Please try again.', 'error');
    
    // Reset button
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}

/* ============================================
   LOGIN FORM
   ============================================ */
function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = form.querySelector('#email').value;
    const password = form.querySelector('#password').value;
    const remember = form.querySelector('#remember').checked;
    
    // Clear previous errors
    clearErrors(form);
    
    // Validate
    let hasErrors = false;
    
    if (!isValidEmail(email)) {
      showFieldError(form.querySelector('#email'), 'Please enter a valid email address');
      hasErrors = true;
    }
    
    if (password.length < 6) {
      showFieldError(form.querySelector('#password'), 'Password must be at least 6 characters');
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-loading"></span> Signing in...';
    submitBtn.disabled = true;
    
    // Simulate API call
    await simulateApiCall(1500);
    
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    // Set logged in flag
    localStorage.setItem('credithopper_logged_in', 'true');
    localStorage.setItem('credithopper_user_email', email);
    
    // Demo: Show success and redirect
    showToast('Login successful! Redirecting...', 'success');
    
    // Check for redirect destination
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    const storedRedirect = sessionStorage.getItem('credithopper_redirect');
    
    let redirectUrl = 'dashboard.html';
    if (redirectParam === 'engine') {
      redirectUrl = 'engine.html';
    } else if (storedRedirect) {
      redirectUrl = storedRedirect;
      sessionStorage.removeItem('credithopper_redirect');
    }
    
    setTimeout(() => {
      window.location.href = redirectUrl;
    }, 1000);
  });
}

/* ============================================
   REGISTER FORM
   ============================================ */
function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = form.querySelector('#firstName').value.trim();
    const lastName = form.querySelector('#lastName').value.trim();
    const email = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;
    const personalUse = form.querySelector('#personalUse')?.checked;
    const terms = form.querySelector('#terms').checked;
    
    // Clear previous errors
    clearErrors(form);
    
    // Validate
    let hasErrors = false;
    
    if (firstName.length < 2) {
      showFieldError(form.querySelector('#firstName'), 'First name is required');
      hasErrors = true;
    }
    
    if (lastName.length < 2) {
      showFieldError(form.querySelector('#lastName'), 'Last name is required');
      hasErrors = true;
    }
    
    if (!isValidEmail(email)) {
      showFieldError(form.querySelector('#email'), 'Please enter a valid email address');
      hasErrors = true;
    }
    
    if (password.length < 8) {
      showFieldError(form.querySelector('#password'), 'Password must be at least 8 characters');
      hasErrors = true;
    }
    
    if (!personalUse) {
      showToast('Please confirm this account is for your personal use only', 'error');
      hasErrors = true;
    }
    
    if (!terms) {
      showToast('Please accept the Terms of Service', 'error');
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-loading"></span> Creating account...';
    submitBtn.disabled = true;
    
    // Simulate API call
    await simulateApiCall(2000);
    
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    // Set logged in flag (trial user)
    localStorage.setItem('credithopper_logged_in', 'true');
    localStorage.setItem('credithopper_user_email', email);
    localStorage.setItem('credithopper_is_trial', 'true');
    localStorage.setItem('credithopper_user_name', firstName + ' ' + lastName);
    
    // Demo: Show success and redirect to engine (start trial flow)
    showToast('Account created! Starting your free trial...', 'success');
    
    setTimeout(() => {
      window.location.href = 'engine.html';
    }, 1000);
  });
}

/* ============================================
   FORGOT PASSWORD FORM
   ============================================ */
function initForgotPasswordForm() {
  const form = document.getElementById('forgotPasswordForm');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = form.querySelector('#email').value.trim();
    
    // Clear previous errors
    clearErrors(form);
    
    // Validate
    if (!isValidEmail(email)) {
      showFieldError(form.querySelector('#email'), 'Please enter a valid email address');
      return;
    }
    
    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<span class="btn-loading"></span> Sending...';
    submitBtn.disabled = true;
    
    // Simulate API call
    await simulateApiCall(1500);
    
    // Reset button
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
    
    // Show success state
    const requestForm = document.getElementById('requestForm');
    const successState = document.getElementById('successState');
    const sentEmail = document.getElementById('sentEmail');
    
    if (requestForm && successState) {
      requestForm.classList.add('hidden');
      successState.classList.remove('hidden');
      sentEmail.textContent = email;
      
      // Start resend timer
      startResendTimer();
    }
  });
}

let resendTimeout = null;
let resendCountdown = 60;

function startResendTimer() {
  resendCountdown = 60;
  updateResendTimer();
  
  resendTimeout = setInterval(() => {
    resendCountdown--;
    updateResendTimer();
    
    if (resendCountdown <= 0) {
      clearInterval(resendTimeout);
    }
  }, 1000);
}

function updateResendTimer() {
  const timerEl = document.getElementById('resendTimer');
  if (!timerEl) return;
  
  if (resendCountdown > 0) {
    timerEl.textContent = `You can resend in ${resendCountdown} seconds`;
  } else {
    timerEl.textContent = '';
  }
}

window.resendEmail = function() {
  if (resendCountdown > 0) {
    showToast(`Please wait ${resendCountdown} seconds before resending`, 'error');
    return;
  }
  
  showToast('Reset link sent again!', 'success');
  startResendTimer();
};

/* ============================================
   PASSWORD STRENGTH
   ============================================ */
function initPasswordStrength() {
  const passwordInput = document.getElementById('password');
  const strengthContainer = document.getElementById('passwordStrength');
  
  if (!passwordInput || !strengthContainer) return;
  
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);
    updateStrengthIndicator(strengthContainer, strength);
  });
}

function calculatePasswordStrength(password) {
  let score = 0;
  
  if (password.length === 0) return { score: 0, label: '' };
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  const labels = ['', 'weak', 'fair', 'good', 'strong'];
  const messages = [
    'Use 8+ characters with mix of letters, numbers & symbols',
    'Weak - Add more characters and variety',
    'Fair - Consider adding symbols or numbers',
    'Good - Almost there, add more variety',
    'Strong - Great password!'
  ];
  
  const level = Math.min(Math.floor(score * 0.8), 4);
  
  return {
    score: level,
    label: labels[level],
    message: messages[level]
  };
}

function updateStrengthIndicator(container, strength) {
  const bars = container.querySelectorAll('.strength-bar');
  const text = container.querySelector('.strength-text');
  
  // Reset bars
  bars.forEach(bar => {
    bar.className = 'strength-bar';
  });
  
  // Fill bars based on strength
  for (let i = 0; i < strength.score; i++) {
    bars[i].classList.add(strength.label);
  }
  
  // Update text
  text.textContent = strength.message;
  text.className = `strength-text ${strength.label}`;
}

/* ============================================
   PASSWORD TOGGLE
   ============================================ */
window.togglePassword = function(inputId) {
  const input = document.getElementById(inputId);
  const toggle = input.parentElement.querySelector('.password-toggle');
  const eyeIcon = toggle.querySelector('.eye-icon');
  const eyeOffIcon = toggle.querySelector('.eye-off-icon');
  
  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon.classList.add('hidden');
    eyeOffIcon.classList.remove('hidden');
  } else {
    input.type = 'password';
    eyeIcon.classList.remove('hidden');
    eyeOffIcon.classList.add('hidden');
  }
};

/* ============================================
   VALIDATION HELPERS
   ============================================ */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function showFieldError(input, message) {
  input.classList.add('error');
  
  const errorEl = document.createElement('div');
  errorEl.className = 'form-error';
  errorEl.innerHTML = `<i data-lucide="alert-circle"></i><span>${message}</span>`;
  
  input.parentElement.parentElement.appendChild(errorEl);
  lucide.createIcons();
}

function clearErrors(form) {
  form.querySelectorAll('.form-input.error').forEach(input => {
    input.classList.remove('error');
  });
  
  form.querySelectorAll('.form-error').forEach(error => {
    error.remove();
  });
}

/* ============================================
   UTILITIES
   ============================================ */
function simulateApiCall(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    padding: 0.875rem 1.25rem;
    background: ${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#374151'};
    color: white;
    border-radius: 10px;
    font-size: 0.875rem;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add styles for loading state
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
  
  .btn-loading {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 0.5rem;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

console.log('CreditHopper Auth JS initialized');
