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
 * GET /api/letters/types
 * Get list of available letter types with descriptions (free access)
 */
router.get(
  '/types',
  lettersController.getLetterTypes
);

/**
 * GET /api/letters/bureaus
 * Get bureau mailing addresses (free access)
 */
router.get(
  '/bureaus',
  lettersController.getBureauAddresses
);

/**
 * GET /api/letters/recommend
 * Get recommended letter type for an item (free access)
 * 
 * Query params:
 * - negativeItemId: string (required)
 * - target: string (optional, default: BUREAU)
 */
router.get(
  '/recommend',
  lettersController.getRecommendation
);

/**
 * POST /api/letters/generate
 * Generate a dispute letter using AI
 * Requires active trial or paid subscription
 * 
 * Body:
 * - negativeItemId: string (required)
 * - letterType: string (required) - INITIAL_DISPUTE, DEBT_VALIDATION, etc.
 * - target: string (required) - BUREAU or FURNISHER
 * - bureau: string (required if target is BUREAU) - EQUIFAX, EXPERIAN, TRANSUNION
 * - customNotes: string (optional) - context for goodwill letters
 * - includeUserInfo: boolean (optional) - include user address header
 * - includeRecipient: boolean (optional) - include recipient address
 */
router.post(
  '/generate',
  requireFullAccess('AI Letter Generation'),
  lettersController.generateLetter
);

/**
 * POST /api/letters/regenerate
 * Generate a new variation of the same letter
 * Requires active trial or paid subscription
 * 
 * Body: same as /generate
 */
router.post(
  '/regenerate',
  requireFullAccess('AI Letter Generation'),
  lettersController.regenerateLetter
);

/**
 * GET /api/letters/templates
 * Get available letter templates for bundles (free access)
 * 
 * Query params:
 * - category: string (optional)
 * - targetType: string (optional) - BUREAU or FURNISHER
 * - accountType: string (optional)
 * - round: number (optional)
 * - premium: boolean (optional)
 */
router.get(
  '/templates',
  lettersController.getTemplates
);

/**
 * GET /api/letters/templates/:id
 * Get a specific template with content
 */
router.get(
  '/templates/:id',
  lettersController.getTemplate
);

/**
 * POST /api/letters/fill-template
 * Fill a static template with user and item data
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

module.exports = router;
