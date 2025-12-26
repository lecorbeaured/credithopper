// ===========================================
// CREDITHOPPER - AUTH ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate, sensitiveRateLimit } = require('../middleware/auth');
const { 
  validate, 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
} = require('../utils/validators');

// ===========================================
// PUBLIC ROUTES (no auth required)
// ===========================================

/**
 * POST /api/auth/register
 * Create a new account
 */
router.post(
  '/register',
  sensitiveRateLimit(10, 60), // 10 attempts per hour
  validate(registerSchema),
  authController.register
);

/**
 * POST /api/auth/login
 * Login to existing account
 */
router.post(
  '/login',
  sensitiveRateLimit(10, 15), // 10 attempts per 15 minutes
  validate(loginSchema),
  authController.login
);

/**
 * GET /api/auth/google
 * Redirect to Google OAuth
 */
router.get(
  '/google',
  authController.googleAuth
);

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get(
  '/google/callback',
  authController.googleCallback
);

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post(
  '/forgot-password',
  sensitiveRateLimit(5, 60), // 5 attempts per hour
  validate(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  sensitiveRateLimit(5, 60), // 5 attempts per hour
  validate(resetPasswordSchema),
  authController.resetPassword
);

// ===========================================
// PROTECTED ROUTES (auth required)
// ===========================================

/**
 * GET /api/auth/me
 * Get current user
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

/**
 * POST /api/auth/change-password
 * Change password (logged in)
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordSchema),
  authController.changePassword
);

/**
 * PATCH /api/auth/profile
 * Update profile
 */
router.patch(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  authController.updateProfile
);

/**
 * POST /api/auth/ssn
 * Update SSN (securely hashed)
 */
router.post(
  '/ssn',
  authenticate,
  authController.updateSSN
);

/**
 * POST /api/auth/verify-ssn
 * Verify SSN matches
 */
router.post(
  '/verify-ssn',
  authenticate,
  authController.verifySSN
);

/**
 * POST /api/auth/logout
 * Logout (log activity)
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

module.exports = router;
