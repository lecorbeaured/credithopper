// ===========================================
// CREDITHOPPER - NEGATIVE ITEMS ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/items.controller');
const { authenticate, requireFullAccess } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /api/items/types
 * Get list of account types
 */
router.get(
  '/types',
  itemsController.getAccountTypes
);

/**
 * GET /api/items/stats
 * Get user's item statistics
 */
router.get(
  '/stats',
  itemsController.getStats
);

/**
 * POST /api/items/bulk-update
 * Update multiple items at once
 * Requires active trial or subscription
 * 
 * Body:
 * - itemIds: string[] (required)
 * - updates: object (required) - only status, onEquifax, onExperian, onTransunion allowed
 */
router.post(
  '/bulk-update',
  requireFullAccess('Bulk Updates'),
  itemsController.bulkUpdate
);

/**
 * POST /api/items/bulk-delete
 * Delete multiple items at once
 * Requires active trial or subscription
 * 
 * Body:
 * - itemIds: string[] (required, max 50)
 */
router.post(
  '/bulk-delete',
  requireFullAccess('Bulk Delete'),
  itemsController.bulkDelete
);

/**
 * GET /api/items/export
 * Export items to CSV
 * 
 * Query params:
 * - status: string (optional)
 * - accountType: string (optional)
 * - bureau: string (optional)
 */
router.get(
  '/export',
  itemsController.exportItems
);

/**
 * POST /api/items/analyze-all
 * Get AI analysis and recommendations for all active items
 * Requires active trial or subscription
 * 
 * Body:
 * - state: string (optional, 2-letter state code for SOL calculation)
 */
router.post(
  '/analyze-all',
  requireFullAccess('AI Analysis'),
  itemsController.analyzeAllItems
);

/**
 * POST /api/items
 * Create a new negative item
 * Requires active trial or subscription
 * 
 * Body:
 * - creditorName: string (required)
 * - accountType: string (required)
 * - onEquifax/onExperian/onTransunion: boolean (at least one required)
 * - Other fields optional
 */
router.post(
  '/',
  requireFullAccess('Adding Items'),
  itemsController.createItem
);

/**
 * GET /api/items
 * List all negative items for current user (free access - view only)
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 50, max: 100)
 * - status: string (ACTIVE, DISPUTING, DELETED, etc.)
 * - accountType: string
 * - bureau: string (EQUIFAX, EXPERIAN, TRANSUNION)
 * - sortBy: string (createdAt, creditorName, balance, fallsOffDate)
 * - sortOrder: string (asc, desc)
 * - search: string
 */
router.get(
  '/',
  itemsController.listItems
);

/**
 * GET /api/items/:id
 * Get a single negative item with full details (free access - view only)
 */
router.get(
  '/:id',
  itemsController.getItem
);

/**
 * GET /api/items/:id/analyze
 * Get detailed AI analysis and recommendations
 * Requires active trial or subscription
 * 
 * Query params:
 * - state: string (optional, 2-letter state code for SOL calculation)
 */
router.get(
  '/:id/analyze',
  requireFullAccess('AI Analysis'),
  itemsController.analyzeItem
);

/**
 * PATCH /api/items/:id
 * Update a negative item
 * Requires active trial or subscription
 */
router.patch(
  '/:id',
  requireFullAccess('Editing Items'),
  itemsController.updateItem
);

/**
 * POST /api/items/:id/mark-deleted
 * Mark an item as deleted from credit report
 * Requires active trial or subscription
 * 
 * Body:
 * - bureaus: string[] (optional) - which bureaus deleted it
 * - debtEliminated: number (optional) - amount of debt eliminated
 */
router.post(
  '/:id/mark-deleted',
  requireFullAccess('Tracking Wins'),
  itemsController.markDeleted
);

/**
 * DELETE /api/items/:id
 * Delete a negative item from the system
 * Requires active trial or subscription
 */
router.delete(
  '/:id',
  requireFullAccess('Deleting Items'),
  itemsController.deleteItem
);

module.exports = router;
