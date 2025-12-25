// ===========================================
// CREDITHOPPER - AUTH SERVICE
// ===========================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');
const prisma = require('../config/database');

const SALT_ROUNDS = 12;

/**
 * Hash a password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
function generateToken(userId, remember = false) {
  const expiresIn = remember ? '30d' : config.jwt.expiresIn;
  
  return jwt.sign(
    { userId },
    config.jwt.secret,
    { expiresIn }
  );
}

/**
 * Generate random token for password reset
 */
function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash SSN for secure storage
 */
async function hashSSN(ssn) {
  // Remove any formatting
  const cleanSSN = ssn.replace(/\D/g, '');
  
  if (cleanSSN.length !== 9) {
    throw new Error('Invalid SSN format');
  }
  
  const hash = await bcrypt.hash(cleanSSN, SALT_ROUNDS);
  const last4 = cleanSSN.slice(-4);
  
  return { hash, last4 };
}

/**
 * Register a new user
 */
async function register(data) {
  const { email, password, firstName, lastName, personalUseOnly, acceptedTerms } = data;
  
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Calculate trial end (7 days from now)
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 7);
  
  // Create user
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      personalUseOnly,
      acceptedTermsAt: acceptedTerms ? new Date() : null,
      trialStart: new Date(),
      trialEnd,
      subscriptionTier: 'FREE',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      subscriptionTier: true,
      trialStart: true,
      trialEnd: true,
      createdAt: true,
    },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'REGISTERED',
      description: 'Account created',
    },
  });
  
  // Generate token
  const token = generateToken(user.id);
  
  return { user, token };
}

/**
 * Login user
 */
async function login(email, password, remember = false) {
  // Find user
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  if (!user) {
    throw new Error('Invalid email or password');
  }
  
  if (!user.isActive) {
    throw new Error('Account is deactivated. Please contact support.');
  }
  
  // Check password
  const isValid = await comparePassword(password, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Invalid email or password');
  }
  
  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'LOGGED_IN',
      description: 'User logged in',
    },
  });
  
  // Generate token
  const token = generateToken(user.id, remember);
  
  // Return user without sensitive data
  const safeUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    street: user.street,
    city: user.city,
    state: user.state,
    zipCode: user.zipCode,
    ssnLast4: user.ssnLast4,
    subscriptionTier: user.subscriptionTier,
    subscriptionStart: user.subscriptionStart,
    subscriptionEnd: user.subscriptionEnd,
    trialStart: user.trialStart,
    trialEnd: user.trialEnd,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
  
  return { user: safeUser, token };
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      ssnLast4: true,
      subscriptionTier: true,
      subscriptionStart: true,
      subscriptionEnd: true,
      trialStart: true,
      trialEnd: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          creditReports: true,
          negativeItems: true,
          disputes: true,
          wins: true,
        },
      },
    },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Calculate trial/subscription status
  const now = new Date();
  const trialActive = user.trialEnd && new Date(user.trialEnd) > now;
  const subscriptionActive = user.subscriptionEnd && new Date(user.subscriptionEnd) > now;
  
  return {
    ...user,
    stats: user._count,
    _count: undefined,
    trialActive,
    subscriptionActive,
    hasActiveAccess: trialActive || subscriptionActive || user.subscriptionTier !== 'FREE',
  };
}

/**
 * Request password reset
 */
async function requestPasswordReset(email) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  // Don't reveal if user exists
  if (!user) {
    return { success: true }; // Silent success
  }
  
  // Generate reset token
  const resetToken = generateResetToken();
  const resetTokenExpires = new Date();
  resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry
  
  // Save token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetToken,
      resetTokenExpires,
    },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'PASSWORD_RESET',
      description: 'Password reset requested',
    },
  });
  
  // TODO: Send email with reset link
  // In production, you would send an email here
  // For now, return the token (only in development)
  
  return {
    success: true,
    // Only include token in development for testing
    ...(config.env === 'development' && { resetToken }),
  };
}

/**
 * Reset password with token
 */
async function resetPassword(token, newPassword) {
  // Find user with valid token
  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExpires: {
        gt: new Date(),
      },
    },
  });
  
  if (!user) {
    throw new Error('Invalid or expired reset token');
  }
  
  // Hash new password
  const passwordHash = await hashPassword(newPassword);
  
  // Update password and clear token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpires: null,
    },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      description: 'Password reset completed',
    },
  });
  
  return { success: true };
}

/**
 * Change password (logged in user)
 */
async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  // Verify current password
  const isValid = await comparePassword(currentPassword, user.passwordHash);
  
  if (!isValid) {
    throw new Error('Current password is incorrect');
  }
  
  // Hash new password
  const passwordHash = await hashPassword(newPassword);
  
  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'PASSWORD_CHANGED',
      description: 'Password changed by user',
    },
  });
  
  return { success: true };
}

/**
 * Update user profile
 */
async function updateProfile(userId, data) {
  const { firstName, lastName, phone, street, city, state, zipCode } = data;
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone !== undefined && { phone }),
      ...(street !== undefined && { street }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(zipCode !== undefined && { zipCode }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      ssnLast4: true,
      subscriptionTier: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'PROFILE_UPDATED',
      description: 'Profile information updated',
    },
  });
  
  return user;
}

/**
 * Update SSN
 */
async function updateSSN(userId, ssn) {
  const { hash, last4 } = await hashSSN(ssn);
  
  await prisma.user.update({
    where: { id: userId },
    data: {
      ssnHash: hash,
      ssnLast4: last4,
    },
  });
  
  return { success: true, ssnLast4: last4 };
}

/**
 * Verify SSN matches stored hash
 */
async function verifySSN(userId, ssn) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { ssnHash: true },
  });
  
  if (!user || !user.ssnHash) {
    return false;
  }
  
  const cleanSSN = ssn.replace(/\D/g, '');
  return bcrypt.compare(cleanSSN, user.ssnHash);
}

// ===========================================
// GOOGLE OAUTH
// ===========================================

/**
 * Generate Google OAuth URL
 */
function getGoogleAuthUrl() {
  const { clientId, redirectUri } = config.google;
  
  if (!clientId) {
    throw new Error('Google OAuth not configured');
  }
  
  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri.startsWith('http') 
      ? redirectUri 
      : `${config.frontendUrl}${redirectUri}`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });
  
  return `${baseUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeGoogleCode(code) {
  const { clientId, clientSecret, redirectUri } = config.google;
  
  const tokenUrl = 'https://oauth2.googleapis.com/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri.startsWith('http') 
        ? redirectUri 
        : `${config.frontendUrl}${redirectUri}`,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code');
  }
  
  return response.json();
}

/**
 * Get user info from Google
 */
async function getGoogleUserInfo(accessToken) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user info from Google');
  }
  
  return response.json();
}

/**
 * Login or register user via Google OAuth
 */
async function googleAuth(code) {
  // Exchange code for tokens
  const tokens = await exchangeGoogleCode(code);
  
  // Get user info
  const googleUser = await getGoogleUserInfo(tokens.access_token);
  
  if (!googleUser.email) {
    throw new Error('Unable to get email from Google');
  }
  
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: googleUser.email.toLowerCase() },
  });
  
  if (user) {
    // Existing user - update Google ID if not set
    if (!user.googleId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.id },
      });
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'LOGGED_IN',
        description: 'User logged in via Google',
      },
    });
  } else {
    // New user - create account
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);
    
    // Extract first and last name
    const firstName = googleUser.given_name || googleUser.name?.split(' ')[0] || 'User';
    const lastName = googleUser.family_name || googleUser.name?.split(' ').slice(1).join(' ') || '';
    
    user = await prisma.user.create({
      data: {
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.id,
        firstName,
        lastName,
        isVerified: googleUser.verified_email || false,
        personalUseOnly: true,
        acceptedTermsAt: new Date(),
        trialStart: new Date(),
        trialEnd,
        subscriptionTier: 'FREE',
        // No password for OAuth users
        passwordHash: '',
      },
    });
    
    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'REGISTERED',
        description: 'Account created via Google',
      },
    });
  }
  
  // Generate token
  const token = generateToken(user.id);
  
  // Return safe user object
  const safeUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    street: user.street,
    city: user.city,
    state: user.state,
    zipCode: user.zipCode,
    ssnLast4: user.ssnLast4,
    subscriptionTier: user.subscriptionTier,
    subscriptionStart: user.subscriptionStart,
    subscriptionEnd: user.subscriptionEnd,
    trialStart: user.trialStart,
    trialEnd: user.trialEnd,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
  
  return { user: safeUser, token };
}

module.exports = {
  hashPassword,
  comparePassword,
  generateToken,
  generateResetToken,
  hashSSN,
  register,
  login,
  getUserById,
  requestPasswordReset,
  resetPassword,
  changePassword,
  updateProfile,
  updateSSN,
  verifySSN,
  getGoogleAuthUrl,
  googleAuth,
};
