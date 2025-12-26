// ===========================================
// CREDITHOPPER - LETTERS ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const lettersController = require('../controllers/letters.controller');
const { authenticate, requireFullAccess } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /api/letters/generate
 * Generate a dispute letter using AI
 * Requires active trial or paid subscription
 * 
 * Body:
 * - negativeItemId: string (required)
 * - disputeId: string (optional)
 * - letterType: string (required) - INITIAL_DISPUTE, METHOD_OF_VERIFICATION, etc.
 * - target: string (required) - BUREAU or FURNISHER
 * - bureau: string (required if target is BUREAU) - EQUIFAX, EXPERIAN, TRANSUNION
 * - round: number (optional, default: 1)
 * - customInstructions: string (optional)
 */
router.post(
  '/generate',
  requireFullAccess('AI Letter Generation'),
  lettersController.generateLetter
);

/**
 * GET /api/letters/templates
 * Get available letter templates (free access)
 * 
 * Query params:
 * - category: string (optional)
 * - targetType: string (optional) - BUREAU or FURNISHER
 * - accountType: string (optional) - COLLECTION, LATE_PAYMENT, etc.
 * - round: number (optional)
 * - premium: boolean (optional)
 */
router.get(
  '/templates',
  lettersController.getTemplates
);

/**
 * GET /api/letters/templates/:id
 * Get a specific template with content (free access)
 */
router.get(
  '/templates/:id',
  lettersController.getTemplate
);

/**
 * POST /api/letters/fill-template
 * Fill a template with user and item data
 * Requires active trial or paid subscription
 * 
 * Body:
 * - templateId: string (required)
 * - negativeItemId: string (required)
 * - bureau: string (optional)
 * - customData: object (optional)
 */
router.post(
  '/fill-template',
  requireFullAccess('Letter Templates'),
  lettersController.fillTemplate
);

/**
 * GET /api/letters/recommend
 * Get recommended letter type for an item (free access)
 * 
 * Query params:
 * - negativeItemId: string (required)
 * - round: number (optional, default: 1)
 * - target: string (optional, default: BUREAU)
 */
router.get(
  '/recommend',
  lettersController.getRecommendation
);

/**
 * GET /api/letters/types
 * Get list of available letter types with descriptions (free access)
 */
router.get(
  '/types',
  lettersController.getLetterTypes
);

module.exports = router;
