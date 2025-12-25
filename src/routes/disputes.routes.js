// ===========================================
// CREDITHOPPER - DISPUTES ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const disputesController = require('../controllers/disputes.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ===========================================
// ROUTES
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
