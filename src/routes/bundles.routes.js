// ===========================================
// CREDITHOPPER - BUNDLES ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const bundlesController = require('../controllers/bundles.controller');
const { optionalAuth } = require('../middleware/auth');

// ===========================================
// PUBLIC ROUTES (No auth required)
// ===========================================

/**
 * GET /api/bundles
 * List all available bundles
 */
router.get(
  '/',
  bundlesController.listBundles
);

/**
 * GET /api/bundles/letters
 * List all individual letters
 * 
 * Query params:
 * - category: string (optional)
 */
router.get(
  '/letters',
  bundlesController.listLetters
);

/**
 * GET /api/bundles/letters/:id
 * Get full letter content
 */
router.get(
  '/letters/:id',
  bundlesController.getLetter
);

/**
 * GET /api/bundles/:idOrSlug
 * Get a single bundle with letter previews
 */
router.get(
  '/:idOrSlug',
  bundlesController.getBundle
);

/**
 * GET /api/bundles/:idOrSlug/download
 * Download bundle PDF
 * 
 * Query params:
 * - email: string (optional, for lead capture)
 */
router.get(
  '/:idOrSlug/download',
  bundlesController.downloadBundle
);

/**
 * POST /api/bundles/:idOrSlug/request
 * Request bundle via email (lead capture)
 * 
 * Body:
 * - email: string (required)
 * - firstName: string (optional)
 */
router.post(
  '/:idOrSlug/request',
  bundlesController.requestBundle
);

// ===========================================
// ADMIN ROUTES
// ===========================================

/**
 * POST /api/bundles/generate-all
 * Generate all bundle PDFs (admin only)
 * 
 * Headers:
 * - x-admin-key: string (required)
 */
router.post(
  '/generate-all',
  bundlesController.generateAllBundles
);

module.exports = router;
