// ===========================================
// CREDITHOPPER - AUTH MIDDLEWARE
// ===========================================

const jwt = require('jsonwebtoken');
const config = require('../config');
const prisma = require('../config/database');
const { unauthorized, forbidden } = require('../utils/response');

/**
 * Calculate subscription/trial status for a user
 */
function getAccessStatus(user) {
  const now = new Date();
  
  // Check trial status
  const trialEnd = user.trialEnd ? new Date(user.trialEnd) : null;
  const trialActive = trialEnd && trialEnd > now;
  const trialDaysLeft = trialActive 
    ? Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)) 
    : 0;
  
  // Check subscription status
  const subscriptionEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : null;
  const subscriptionActive = subscriptionEnd && subscriptionEnd > now;
  const subscriptionDaysLeft = subscriptionActive
    ? Math.ceil((subscriptionEnd - now) / (1000 * 60 * 60 * 24))
    : 0;
  
  // Determine if user has full access
  const isPaid = user.subscriptionTier !== 'FREE' && subscriptionActive;
  const hasFullAccess = trialActive || isPaid;
  
  // Determine access level
  let accessLevel = 'EXPIRED';
  if (isPaid) {
    accessLevel = 'PAID';
  } else if (trialActive) {
    accessLevel = 'TRIAL';
  }
  
  return {
    // Trial info
    trialActive,
    trialEnd,
    trialDaysLeft,
    
    // Subscription info
    subscriptionActive,
    subscriptionEnd,
    subscriptionDaysLeft,
    subscriptionTier: user.subscriptionTier,
    
    // Access summary
    isPaid,
    hasFullAccess,
    accessLevel,
    
    // For frontend display
    message: getAccessMessage(accessLevel, trialDaysLeft, subscriptionDaysLeft),
  };
}

/**
 * Get user-friendly access message
 */
function getAccessMessage(accessLevel, trialDaysLeft, subscriptionDaysLeft) {
  switch (accessLevel) {
    case 'PAID':
      return subscriptionDaysLeft <= 7 
        ? `Subscription renews in ${subscriptionDaysLeft} days`
        : 'Full access';
    case 'TRIAL':
      if (trialDaysLeft <= 1) {
        return 'Trial ends today! Subscribe to keep access.';
      } else if (trialDaysLeft <= 3) {
        return `Trial ends in ${trialDaysLeft} days. Subscribe now!`;
      }
      return `${trialDaysLeft} days left in trial`;
    case 'EXPIRED':
      return 'Trial expired. Subscribe to regain full access.';
    default:
      return '';
  }
}

/**
 * Verify JWT token and attach user to request
 */
async function authenticate(req, res, next) {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return unauthorized(res, 'No token provided');
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return unauthorized(res, 'Token expired');
      }
      return unauthorized(res, 'Invalid token');
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      },
    });
    
    if (!user) {
      return unauthorized(res, 'User not found');
    }
    
    if (!user.isActive) {
      return forbidden(res, 'Account is deactivated');
    }
    
    // Attach user and access status to request
    req.user = user;
    req.userId = user.id;
    req.access = getAccessStatus(user);
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return unauthorized(res, 'Authentication failed');
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          subscriptionTier: true,
          subscriptionEnd: true,
          trialEnd: true,
          isActive: true,
        },
      });
      
      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
        req.access = getAccessStatus(user);
      }
    } catch (err) {
      // Token invalid, but that's okay for optional auth
    }
    
    next();
  } catch (error) {
    next();
  }
}

/**
 * Require full access (active trial or paid subscription)
 * Use this for premium features like AI analysis, letter generation
 */
function requireFullAccess(featureName = 'This feature') {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }
    
    if (!req.access || !req.access.hasFullAccess) {
      return res.status(402).json({
        success: false,
        error: `${featureName} requires an active subscription`,
        code: 'SUBSCRIPTION_REQUIRED',
        access: req.access,
        upgradeUrl: '/checkout.html',
      });
    }
    
    next();
  };
}

/**
 * Check if user has active subscription or trial (legacy support)
 */
function requireSubscription(requiredTier = null) {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return unauthorized(res, 'Authentication required');
    }
    
    // Use the new access check
    if (!req.access.hasFullAccess) {
      return res.status(402).json({
        success: false,
        error: 'Subscription required. Please upgrade your plan.',
        code: 'SUBSCRIPTION_REQUIRED',
        access: req.access,
        upgradeUrl: '/checkout.html',
      });
    }
    
    // Check specific tier requirement (for future tier-based features)
    if (requiredTier && req.access.isPaid) {
      const tierLevels = {
        'FREE': 0,
        'STARTER': 1,
        'PRO': 2,
        'UNLIMITED': 3,
      };
      
      const userLevel = tierLevels[user.subscriptionTier] || 0;
      const requiredLevel = tierLevels[requiredTier] || 0;
      
      if (userLevel < requiredLevel) {
        return res.status(402).json({
          success: false,
          error: `This feature requires ${requiredTier} plan or higher`,
          code: 'TIER_REQUIRED',
          requiredTier,
          currentTier: user.subscriptionTier,
        });
      }
    }
    
    next();
  };
}

/**
 * Check if user owns the resource
 */
function requireOwnership(getResourceUserId) {
  return async (req, res, next) => {
    try {
      const resourceUserId = await getResourceUserId(req);
      
      if (!resourceUserId) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found',
        });
      }
      
      if (resourceUserId !== req.userId) {
        return forbidden(res, 'You do not have permission to access this resource');
      }
      
      next();
    } catch (error) {
      console.error('Ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify ownership',
      });
    }
  };
}

/**
 * Rate limit for sensitive operations (login, register, password reset)
 */
const authRateLimits = new Map();

function sensitiveRateLimit(maxAttempts = 5, windowMinutes = 15) {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    const record = authRateLimits.get(key) || { attempts: 0, resetAt: now + windowMs };
    
    // Reset if window has passed
    if (now > record.resetAt) {
      record.attempts = 0;
      record.resetAt = now + windowMs;
    }
    
    record.attempts++;
    authRateLimits.set(key, record);
    
    if (record.attempts > maxAttempts) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      
      return res.status(429).json({
        success: false,
        error: 'Too many attempts. Please try again later.',
        retryAfter,
      });
    }
    
    next();
  };
}

/**
 * Clear rate limit on successful auth
 */
function clearRateLimit(req) {
  const key = req.ip + ':' + req.path;
  authRateLimits.delete(key);
}

module.exports = {
  authenticate,
  optionalAuth,
  requireFullAccess,
  requireSubscription,
  requireOwnership,
  sensitiveRateLimit,
  clearRateLimit,
  getAccessStatus,
};
