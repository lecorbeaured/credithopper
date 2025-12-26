// ===========================================
// CREDITHOPPER - DASHBOARD CONTROLLER
// ===========================================

const dashboardService = require('../services/dashboard.service');
const { success, created, error, notFound } = require('../utils/response');

/**
 * GET /api/dashboard
 * Get complete dashboard data
 */
async function getDashboard(req, res, next) {
  try {
    const data = await dashboardService.getDashboardData(req.userId);

    // Include access status for frontend
    return success(res, { 
      dashboard: data,
      access: req.access,
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
      }
    }, 'Dashboard data retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/access
 * Get subscription/trial status only
 */
async function getAccessStatus(req, res, next) {
  try {
    return success(res, { 
      access: req.access,
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        subscriptionTier: req.user.subscriptionTier,
      }
    }, 'Access status retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/items
 * Get items statistics only
 */
async function getItemsStats(req, res, next) {
  try {
    const stats = await dashboardService.getItemsStats(req.userId);

    return success(res, { stats }, 'Items stats retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/disputes
 * Get dispute statistics only
 */
async function getDisputeStats(req, res, next) {
  try {
    const stats = await dashboardService.getDisputeStats(req.userId);

    return success(res, { stats }, 'Dispute stats retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/wins
 * Get wins statistics only
 */
async function getWinsStats(req, res, next) {
  try {
    const stats = await dashboardService.getWinsStats(req.userId);

    return success(res, { stats }, 'Wins stats retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/attention
 * Get items requiring attention
 */
async function getAttention(req, res, next) {
  try {
    const attention = await dashboardService.getAttentionItems(req.userId);

    return success(res, { attention }, 'Attention items retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/progress
 * Get progress metrics
 */
async function getProgress(req, res, next) {
  try {
    const progress = await dashboardService.getProgressMetrics(req.userId);

    return success(res, { progress }, 'Progress metrics retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/activity
 * Get recent activity feed
 */
async function getActivity(req, res, next) {
  try {
    const { limit = 20 } = req.query;
    
    const activity = await dashboardService.getRecentActivity(
      req.userId, 
      Math.min(parseInt(limit), 50)
    );

    return success(res, { activity }, 'Activity retrieved');

  } catch (err) {
    next(err);
  }
}

// ===========================================
// WINS ENDPOINTS
// ===========================================

/**
 * POST /api/dashboard/wins
 * Create a new win record
 */
async function createWin(req, res, next) {
  try {
    const {
      negativeItemId,
      disputeId,
      winType,
      bureausAffected,
      debtEliminated,
      notes,
    } = req.body;

    // Validate required fields
    if (!negativeItemId) {
      return error(res, 'negativeItemId is required', 400);
    }

    if (!winType) {
      return error(res, 'winType is required', 400);
    }

    // Validate win type
    const validWinTypes = [
      'FULL_DELETION',
      'PARTIAL_DELETION',
      'CORRECTION',
      'BALANCE_REDUCTION',
      'STATUS_UPDATE',
    ];

    if (!validWinTypes.includes(winType)) {
      return error(res, `winType must be one of: ${validWinTypes.join(', ')}`, 400);
    }

    const win = await dashboardService.createWin(req.userId, {
      negativeItemId,
      disputeId,
      winType,
      bureausAffected,
      debtEliminated,
      notes,
    });

    return created(res, { win }, 'Win recorded successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/wins
 * List all wins
 */
async function listWins(req, res, next) {
  try {
    const { page = 1, limit = 50 } = req.query;

    const result = await dashboardService.getUserWins(req.userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });

    return success(res, result, 'Wins retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/dashboard/wins/:id
 * Get a single win
 */
async function getWin(req, res, next) {
  try {
    const { id } = req.params;

    const win = await dashboardService.getWinById(id, req.userId);

    if (!win) {
      return notFound(res, 'Win not found');
    }

    return success(res, { win }, 'Win retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/dashboard/wins/:id
 * Delete a win record
 */
async function deleteWin(req, res, next) {
  try {
    const { id } = req.params;

    await dashboardService.deleteWin(id, req.userId);

    return success(res, null, 'Win deleted');

  } catch (err) {
    if (err.message === 'Win not found') {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/dashboard/win-types
 * Get list of win types
 */
async function getWinTypes(req, res, next) {
  try {
    const winTypes = [
      {
        value: 'FULL_DELETION',
        label: 'Full Deletion',
        description: 'Item completely removed from credit report',
        icon: '🎉',
      },
      {
        value: 'PARTIAL_DELETION',
        label: 'Partial Deletion',
        description: 'Item removed from some but not all bureaus',
        icon: '✨',
      },
      {
        value: 'CORRECTION',
        label: 'Correction',
        description: 'Inaccurate information was corrected',
        icon: '✏️',
      },
      {
        value: 'BALANCE_REDUCTION',
        label: 'Balance Reduction',
        description: 'Balance was reduced or set to zero',
        icon: '💰',
      },
      {
        value: 'STATUS_UPDATE',
        label: 'Status Update',
        description: 'Account status was updated favorably',
        icon: '📈',
      },
    ];

    return success(res, { winTypes }, 'Win types retrieved');

  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboard,
  getAccessStatus,
  getItemsStats,
  getDisputeStats,
  getWinsStats,
  getAttention,
  getProgress,
  getActivity,
  createWin,
  listWins,
  getWin,
  deleteWin,
  getWinTypes,
};
