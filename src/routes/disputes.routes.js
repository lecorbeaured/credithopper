// ===========================================
// CREDITHOPPER - DISPUTES ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const disputesController = require('../controllers/disputes.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');

// Import new services for enhanced functionality
const timingService = require('../services/timing.service');
const disputeService = require('../services/dispute.service');
const letterService = require('../services/letter.service');
const prisma = require('../config/database');
const { success, created, error, notFound } = require('../utils/response');

// All routes require authentication
router.use(authenticate);

// ===========================================
// TIMING ANALYSIS ROUTES (Credit Repair Engine)
// ===========================================

/**
 * GET /api/disputes/analyze-item/:itemId
 * Analyze timing and provide dispute recommendation
 */
router.get('/analyze-item/:itemId', async (req, res, next) => {
  try {
    const { itemId } = req.params;
    
    const item = await prisma.negativeItem.findUnique({
      where: { id: itemId },
    });
    
    if (!item) {
      return notFound(res, 'Item not found');
    }
    
    if (item.userId !== req.userId) {
      return error(res, 'Unauthorized', 403);
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { state: true },
    });
    
    if (!user?.state) {
      return error(res, 'Please set your state in profile settings for accurate analysis', 400);
    }
    
    const analysis = await timingService.analyzeItemTiming(item, user.state);
    
    return success(res, { analysis }, 'Item analysis complete');
    
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/disputes/analyze-all
 * Analyze all user's negative items with timing recommendations
 */
router.get('/analyze-all', async (req, res, next) => {
  try {
    const analysis = await timingService.analyzeAllUserItems(req.userId);
    return success(res, analysis, 'All items analyzed');
  } catch (err) {
    if (err.message.includes('state not set')) {
      return error(res, 'Please set your state in profile settings', 400);
    }
    next(err);
  }
});

// ===========================================
// DUAL-TRACK DISPUTE STRATEGY
// ===========================================

/**
 * POST /api/disputes/create-dual-track
 * Create dual-track dispute (bureau + furnisher simultaneously)
 */
router.post('/create-dual-track', requireSubscription('STARTER'), async (req, res, next) => {
  try {
    const {
      negativeItemId,
      disputeReasons = [],
      userContext = null,
      generateLetters = true,
    } = req.body;
    
    if (!negativeItemId) {
      return error(res, 'Negative item ID is required', 400);
    }
    
    const result = await disputeService.initiateDualTrackDispute(
      negativeItemId,
      req.userId,
      { disputeReasons, userContext }
    );
    
    if (generateLetters) {
      const allDisputeIds = [
        ...result.bureauDisputes.map(d => d.disputeId),
        result.furnisherDispute?.disputeId,
      ].filter(Boolean);
      
      const letters = await letterService.generateBatchLetters(allDisputeIds, req.userId);
      result.letters = letters;
    }
    
    return created(res, result, 'Dual-track dispute initiated');
    
  } catch (err) {
    next(err);
  }
});

// ===========================================
// ENHANCED SUMMARY & OVERDUE CHECKS
// ===========================================

/**
 * GET /api/disputes/summary
 * Get comprehensive disputes summary for dashboard
 */
router.get('/summary', async (req, res, next) => {
  try {
    const result = await disputeService.getUserDisputesSummary(req.userId);
    return success(res, result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/disputes/overdue
 * Get disputes with overdue responses (30-day deadline passed)
 */
router.get('/overdue', async (req, res, next) => {
  try {
    const allOverdue = await disputeService.checkOverdueResponses();
    const userOverdue = allOverdue.filter(d => d.userId === req.userId);
    
    return success(res, {
      overdueDisputes: userOverdue,
      count: userOverdue.length,
    });
    
  } catch (err) {
    next(err);
  }
});

// ===========================================
// BUREAU INFO
// ===========================================

/**
 * GET /api/disputes/bureau-addresses
 * Get credit bureau mailing addresses
 */
router.get('/bureau-addresses', async (req, res, next) => {
  try {
    return success(res, {
      bureaus: disputeService.BUREAU_ADDRESSES,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/disputes/sol-info/:state
 * Get statute of limitations info for a state
 */
router.get('/sol-info/:state', async (req, res, next) => {
  try {
    const { state } = req.params;
    const stateUpper = state.toUpperCase();
    
    const solData = timingService.STATE_SOL_DATA[stateUpper];
    
    if (!solData) {
      return notFound(res, `SOL data not found for state: ${state}`);
    }
    
    return success(res, {
      state: stateUpper,
      statueOfLimitations: {
        writtenContract: solData.written,
        oralContract: solData.oral,
        promissoryNote: solData.promissory,
        openAccount: solData.open,
      },
      note: 'Statute of limitations in years. Open account applies to credit cards.',
    });
    
  } catch (err) {
    next(err);
  }
});

// ===========================================
// EXISTING ROUTES
// ===========================================

/**
 * GET /api/disputes/response-types
 * Get list of valid response types
 */
router.get(
  '/response-types',
  disputesController.getResponseTypes
);

/**
 * GET /api/disputes/attention
 * Get disputes requiring attention (overdue, etc.)
 */
router.get(
  '/attention',
  disputesController.getAttention
);

/**
 * GET /api/disputes/stats
 * Get dispute statistics
 */
router.get(
  '/stats',
  disputesController.getStats
);

/**
 * GET /api/disputes/item/:itemId/timeline
 * Get dispute timeline for a specific item
 */
router.get(
  '/item/:itemId/timeline',
  disputesController.getTimeline
);

/**
 * POST /api/disputes
 * Create a new dispute
 * 
 * Body:
 * - negativeItemId: string (required)
 * - target: string (required) - BUREAU or FURNISHER
 * - bureau: string (required if target is BUREAU)
 * - strategy: string (optional)
 * - letterType: string (optional)
 * - letterContent: string (optional)
 * - customNotes: string (optional)
 */
router.post(
  '/',
  disputesController.createDispute
);

/**
 * GET /api/disputes
 * List all disputes
 * 
 * Query params:
 * - page, limit, status, target, negativeItemId, sortBy, sortOrder
 */
router.get(
  '/',
  disputesController.listDisputes
);

/**
 * GET /api/disputes/:id
 * Get a single dispute
 */
router.get(
  '/:id',
  disputesController.getDispute
);

/**
 * PATCH /api/disputes/:id
 * Update a dispute
 */
router.patch(
  '/:id',
  disputesController.updateDispute
);

/**
 * DELETE /api/disputes/:id
 * Delete a draft dispute
 */
router.delete(
  '/:id',
  disputesController.deleteDispute
);

/**
 * POST /api/disputes/:id/generate-letter
 * Generate AI letter for this dispute
 * Requires STARTER plan
 * 
 * Body:
 * - customInstructions: string (optional)
 */
router.post(
  '/:id/generate-letter',
  requireSubscription('STARTER'),
  disputesController.generateLetter
);

/**
 * POST /api/disputes/:id/mail
 * Mark dispute as mailed
 * 
 * Body:
 * - mailedAt: datetime (optional, defaults to now)
 * - mailedVia: string (optional) - USPS, CERTIFIED, etc.
 * - trackingNumber: string (optional)
 */
router.post(
  '/:id/mail',
  disputesController.markAsMailed
);

/**
 * POST /api/disputes/:id/response
 * Log a response from bureau/furnisher
 * 
 * Body:
 * - responseType: string (required) - VERIFIED, DELETED, UPDATED, NO_RESPONSE, FRIVOLOUS, PENDING
 * - responseDate: datetime (optional)
 * - responseNotes: string (optional)
 * - responseDocumentPath: string (optional)
 */
router.post(
  '/:id/response',
  disputesController.logResponse
);

/**
 * POST /api/disputes/:id/advance
 * Advance to next dispute round
 */
router.post(
  '/:id/advance',
  disputesController.advanceRound
);

/**
 * POST /api/disputes/:id/complete
 * Mark dispute as complete
 * 
 * Body:
 * - outcome: string (optional)
 */
router.post(
  '/:id/complete',
  disputesController.markAsComplete
);

module.exports = router;
