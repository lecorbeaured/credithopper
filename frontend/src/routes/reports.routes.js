// ===========================================
// CREDITHOPPER - CREDIT REPORTS ROUTES
// ===========================================

const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reports.controller');
const { authenticate, requireFullAccess } = require('../middleware/auth');
const { uploadCreditReport, handleUploadError } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// ===========================================
// ROUTES
// ===========================================

/**
 * POST /api/reports/upload
 * Upload a credit report PDF
 * Requires active trial or subscription
 * 
 * Body: multipart/form-data
 * - report: PDF file (required)
 * - bureau: string (optional) - EQUIFAX, EXPERIAN, TRANSUNION
 */
router.post(
  '/upload',
  requireFullAccess('Report Upload'),
  uploadCreditReport.single('report'),
  handleUploadError,
  reportsController.uploadReport
);

/**
 * GET /api/reports
 * List all reports for current user (free access - view only)
 * 
 * Query params:
 * - page: number (default: 1)
 * - limit: number (default: 20, max: 100)
 */
router.get(
  '/',
  reportsController.listReports
);

/**
 * GET /api/reports/limits
 * Get upload limits for current user
 */
router.get(
  '/limits',
  reportsController.getUploadLimits
);

/**
 * GET /api/reports/:id
 * Get a single report with negative items (free access - view only)
 */
router.get(
  '/:id',
  reportsController.getReport
);

/**
 * POST /api/reports/:id/parse
 * Trigger AI parsing of a credit report
 * Requires active trial or subscription
 */
router.post(
  '/:id/parse',
  requireFullAccess('AI Report Parsing'),
  reportsController.parseReport
);

/**
 * GET /api/reports/:id/download
 * Download the original PDF file (free access)
 */
router.get(
  '/:id/download',
  reportsController.downloadReport
);

/**
 * PATCH /api/reports/:id
 * Update report metadata
 * Requires active trial or subscription
 * 
 * Body:
 * - bureau: string (optional)
 * - reportDate: datetime (optional)
 */
router.patch(
  '/:id',
  requireFullAccess('Editing Reports'),
  reportsController.updateReport
);

/**
 * DELETE /api/reports/:id
 * Delete a credit report and its file
 * Requires active trial or subscription
 */
router.delete(
  '/:id',
  requireFullAccess('Deleting Reports'),
  reportsController.deleteReport
);

module.exports = router;
