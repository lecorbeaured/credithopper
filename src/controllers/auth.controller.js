// ===========================================
// CREDITHOPPER - AUTH CONTROLLER
// ===========================================

const authService = require('../services/auth.service');
const { success, created, error, unauthorized } = require('../utils/response');
const { clearRateLimit } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Create a new user account
 */
async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password, personalUseOnly, acceptedTerms } = req.validated;
    
    const result = await authService.register({
      firstName,
      lastName,
      email,
      password,
      personalUseOnly,
      acceptedTerms,
    });
    
    // Clear rate limit on success
    clearRateLimit(req);
    
    return created(res, {
      user: result.user,
      token: result.token,
    }, 'Account created successfully');
    
  } catch (err) {
    if (err.message.includes('already exists')) {
      return error(res, err.message, 409);
    }
    next(err);
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return token
 */
async function login(req, res, next) {
  try {
    const { email, password, remember } = req.validated;
    
    const result = await authService.login(email, password, remember);
    
    // Clear rate limit on success
    clearRateLimit(req);
    
    return success(res, {
      user: result.user,
      token: result.token,
    }, 'Login successful');
    
  } catch (err) {
    if (err.message.includes('Invalid') || err.message.includes('deactivated')) {
      return unauthorized(res, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
async function getMe(req, res, next) {
  try {
    const user = await authService.getUserById(req.userId);
    
    return success(res, { user }, 'User retrieved successfully');
    
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
async function forgotPassword(req, res, next) {
  try {
    const { email } = req.validated;
    
    const result = await authService.requestPasswordReset(email);
    
    // Clear rate limit on success
    clearRateLimit(req);
    
    // Always return success to prevent email enumeration
    return success(res, result, 'If an account exists with this email, a reset link has been sent');
    
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.validated;
    
    await authService.resetPassword(token, password);
    
    // Clear rate limit on success
    clearRateLimit(req);
    
    return success(res, null, 'Password reset successfully');
    
  } catch (err) {
    if (err.message.includes('Invalid') || err.message.includes('expired')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * POST /api/auth/change-password
 * Change password for logged in user
 */
async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.validated;
    
    await authService.changePassword(req.userId, currentPassword, newPassword);
    
    return success(res, null, 'Password changed successfully');
    
  } catch (err) {
    if (err.message.includes('incorrect')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * PATCH /api/auth/profile
 * Update user profile
 */
async function updateProfile(req, res, next) {
  try {
    const user = await authService.updateProfile(req.userId, req.validated);
    
    return success(res, { user }, 'Profile updated successfully');
    
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/ssn
 * Update user SSN (securely hashed)
 */
async function updateSSN(req, res, next) {
  try {
    const { ssn } = req.body;
    
    if (!ssn) {
      return error(res, 'SSN is required', 400);
    }
    
    const result = await authService.updateSSN(req.userId, ssn);
    
    return success(res, { ssnLast4: result.ssnLast4 }, 'SSN updated successfully');
    
  } catch (err) {
    if (err.message.includes('Invalid SSN')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * POST /api/auth/verify-ssn
 * Verify SSN matches stored hash
 */
async function verifySSN(req, res, next) {
  try {
    const { ssn } = req.body;
    
    if (!ssn) {
      return error(res, 'SSN is required', 400);
    }
    
    const isValid = await authService.verifySSN(req.userId, ssn);
    
    return success(res, { valid: isValid }, isValid ? 'SSN verified' : 'SSN does not match');
    
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Logout (client-side token removal, but log activity)
 */
async function logout(req, res, next) {
  try {
    const prisma = require('../config/database');
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.userId,
        action: 'LOGGED_OUT',
        description: 'User logged out',
      },
    });
    
    return success(res, null, 'Logged out successfully');
    
  } catch (err) {
    next(err);
  }
}

// ===========================================
// GOOGLE OAUTH
// ===========================================

/**
 * GET /api/auth/google
 * Redirect to Google OAuth
 */
async function googleAuth(req, res, next) {
  try {
    const authUrl = authService.getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (err) {
    if (err.message.includes('not configured')) {
      return error(res, 'Google OAuth is not configured', 503);
    }
    next(err);
  }
}

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
async function googleCallback(req, res, next) {
  try {
    const { code, error: oauthError } = req.query;
    
    // Get frontend URL for redirects
    const config = require('../config');
    const frontendUrl = config.frontendUrl || '';
    
    if (oauthError) {
      // User denied access or other error
      return res.redirect(`${frontendUrl}/login.html?error=google_denied`);
    }
    
    if (!code) {
      return res.redirect(`${frontendUrl}/login.html?error=no_code`);
    }
    
    // Exchange code and get/create user
    const result = await authService.googleAuth(code);
    
    // Redirect to frontend with token
    // Frontend will store the token and redirect to dashboard
    const redirectUrl = `${frontendUrl}/login.html?token=${result.token}&google=success`;
    
    return res.redirect(redirectUrl);
    
  } catch (err) {
    console.error('Google OAuth error:', err);
    const config = require('../config');
    const frontendUrl = config.frontendUrl || '';
    return res.redirect(`${frontendUrl}/login.html?error=google_failed`);
  }
}

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  updateSSN,
  verifySSN,
  logout,
  googleAuth,
  googleCallback,
};
