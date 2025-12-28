// ===========================================
// CREDITHOPPER - DASHBOARD ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ===========================================
// DASHBOARD ROUTES
// ===========================================

/**
 * GET /api/dashboard
 * Get complete dashboard data
 */
router.get(
  '/',
  dashboardController.getDashboard
);

/**
 * GET /api/dashboard/access
 * Get subscription/trial status
 */
router.get(
  '/access',
  dashboardController.getAccessStatus
);

/**
 * GET /api/dashboard/items
 * Get items statistics
 */
router.get(
  '/items',
  dashboardController.getItemsStats
);

/**
 * GET /api/dashboard/disputes
 * Get dispute statistics
 */
router.get(
  '/disputes',
  dashboardController.getDisputeStats
);

/**
 * GET /api/dashboard/wins-stats
 * Get wins statistics only
 */
router.get(
  '/wins-stats',
  dashboardController.getWinsStats
);

/**
 * GET /api/dashboard/attention
 * Get items requiring attention
 */
router.get(
  '/attention',
  dashboardController.getAttention
);

/**
 * GET /api/dashboard/progress
 * Get progress metrics
 */
router.get(
  '/progress',
  dashboardController.getProgress
);

/**
 * GET /api/dashboard/activity
 * Get recent activity feed
 * 
 * Query params:
 * - limit: number (default: 20, max: 50)
 */
router.get(
  '/activity',
  dashboardController.getActivity
);

/**
 * GET /api/dashboard/onboarding
 * Get onboarding checklist status
 */
router.get(
  '/onboarding',
  dashboardController.getOnboarding
);

/**
 * GET /api/dashboard/quick-actions
 * Get personalized quick actions based on user state
 */
router.get(
  '/quick-actions',
  dashboardController.getQuickActions
);

// ===========================================
// WINS ROUTES
// ===========================================

/**
 * GET /api/dashboard/win-types
 * Get list of win types
 */
router.get(
  '/win-types',
  dashboardController.getWinTypes
);

/**
 * POST /api/dashboard/wins
 * Create a new win record
 * 
 * Body:
 * - negativeItemId: string (required)
 * - disputeId: string (optional)
 * - winType: string (required)
 * - bureausAffected: string[] (optional)
 * - debtEliminated: number (optional)
 * - notes: string (optional)
 */
router.post(
  '/wins',
  dashboardController.createWin
);

/**
 * GET /api/dashboard/wins
 * List all wins
 * 
 * Query params:
 * - page, limit
 */
router.get(
  '/wins',
  dashboardController.listWins
);

/**
 * GET /api/dashboard/wins/:id
 * Get a single win
 */
router.get(
  '/wins/:id',
  dashboardController.getWin
);

/**
 * DELETE /api/dashboard/wins/:id
 * Delete a win record
 */
router.delete(
  '/wins/:id',
  dashboardController.deleteWin
);

module.exports = router;
