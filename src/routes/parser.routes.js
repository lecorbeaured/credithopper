// ===========================================
// CREDITHOPPER - PARSER ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const parserController = require('../controllers/parser.controller');
const { authenticate, requireSubscription } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ===========================================
// ROUTES
// ===========================================

/**
 * GET /api/parser/supported-formats
 * Get information about supported report formats
 */
router.get(
  '/supported-formats',
  parserController.getSupportedFormats
);

/**
 * POST /api/parser/extract-text
 * Extract raw text from a PDF (debugging/preview)
 * Requires STARTER plan
 * 
 * Body:
 * - reportId: string (required)
 */
router.post(
  '/extract-text',
  requireSubscription('STARTER'),
  parserController.extractText
);

/**
 * POST /api/parser/detect-bureau
 * Detect which bureau a report is from
 * 
 * Body:
 * - reportId: string (optional)
 * - text: string (optional) - raw text to analyze
 */
router.post(
  '/detect-bureau',
  parserController.detectBureau
);

/**
 * POST /api/parser/parse-text
 * Parse raw text to extract negative items
 * Requires STARTER plan
 * 
 * Body:
 * - text: string (required)
 * - bureau: string (optional) - EQUIFAX, EXPERIAN, TRANSUNION
 */
router.post(
  '/parse-text',
  requireSubscription('STARTER'),
  parserController.parseText
);

/**
 * POST /api/parser/parse-account
 * Parse a single account block of text
 * 
 * Body:
 * - text: string (required)
 */
router.post(
  '/parse-account',
  parserController.parseAccountBlock
);

/**
 * POST /api/parser/reparse
 * Re-parse a previously parsed report
 * Requires STARTER plan
 * 
 * Body:
 * - reportId: string (required)
 * - deleteExistingItems: boolean (optional, default: false)
 */
router.post(
  '/reparse',
  requireSubscription('STARTER'),
  parserController.reparseReport
);

module.exports = router;
