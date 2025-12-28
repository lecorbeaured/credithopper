// ===========================================
// CREDITHOPPER - CREDIT REPORTS CONTROLLER
// ===========================================

const reportsService = require('../services/reports.service');
const { success, created, error, notFound, forbidden } = require('../utils/response');
const path = require('path');
const fs = require('fs');

/**
 * POST /api/reports/upload
 * Upload a credit report PDF or HTML
 */
async function uploadReport(req, res, next) {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return error(res, 'No file uploaded. Please select a PDF or HTML file.', 400);
    }
    
    // Check upload limits
    const limits = await reportsService.checkReportLimit(req.userId);
    
    if (!limits.canUpload) {
      // Delete the uploaded file since we can't process it
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      
      return forbidden(res, 
        `You have reached your report limit (${limits.max}). ` +
        'Please delete an existing report or upgrade your plan.'
      );
    }
    
    // Get bureau from request body if provided
    let bureau = req.body.bureau || null;
    
    // Try to auto-detect bureau from file content
    if (!bureau) {
      try {
        const fileContent = fs.readFileSync(req.file.path, 'utf8');
        bureau = reportsService.detectBureau(fileContent);
      } catch (e) {
        // PDF files can't be read as text directly, will detect during parsing
        console.log('Could not auto-detect bureau from file (likely PDF)');
      }
    }
    
    // Create report record
    const report = await reportsService.createReport(req.userId, req.file, bureau);
    
    return created(res, {
      report: {
        ...report,
        bureauDetected: !!bureau,
      },
      limits: {
        remaining: limits.remaining - 1,
        max: limits.max,
      },
      nextStep: 'Call POST /api/reports/' + report.id + '/parse to extract negative items',
    }, 'Credit report uploaded successfully');
    
  } catch (err) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to cleanup file:', e);
      }
    }
    next(err);
  }
}

/**
 * GET /api/reports
 * List all reports for current user
 */
async function listReports(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const result = await reportsService.getUserReports(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
    });
    
    return success(res, result, 'Reports retrieved successfully');
    
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/:id
 * Get a single report with its negative items
 */
async function getReport(req, res, next) {
  try {
    const { id } = req.params;
    
    const report = await reportsService.getReportById(id, req.userId);
    
    if (!report) {
      return notFound(res, 'Report not found');
    }
    
    return success(res, { report }, 'Report retrieved successfully');
    
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/reports/:id/parse
 * Trigger parsing of a credit report
 */
async function parseReport(req, res, next) {
  try {
    const { id } = req.params;
    
    // Get report
    const report = await reportsService.getReportById(id, req.userId);
    
    if (!report) {
      return notFound(res, 'Report not found');
    }
    
    // Check if already parsing
    if (report.parseStatus === 'PROCESSING') {
      return error(res, 'Report is already being processed', 400);
    }
    
    // Import parser service
    const parserService = require('../services/parser.service');
    
    // Parse the report (this may take a moment)
    const result = await parserService.parseReport(id, req.userId);
    
    return success(res, {
      reportId: id,
      status: 'COMPLETED',
      bureau: result.bureau,
      itemsFound: result.itemsFound,
      itemsCreated: result.itemsCreated,
      items: result.items.map(item => ({
        id: item.id,
        creditorName: item.creditorName,
        accountType: item.accountType,
        balance: item.balance,
        recommendation: item.recommendation,
      })),
    }, 'Report parsed successfully');
    
  } catch (err) {
    if (err.message.includes('PDF') || err.message.includes('parse')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * DELETE /api/reports/:id
 * Delete a credit report
 */
async function deleteReport(req, res, next) {
  try {
    const { id } = req.params;
    
    // Check if report exists and belongs to user
    const report = await reportsService.getReportById(id, req.userId);
    
    if (!report) {
      return notFound(res, 'Report not found');
    }
    
    // Delete report
    await reportsService.deleteReport(id, req.userId);
    
    return success(res, null, 'Report deleted successfully');
    
  } catch (err) {
    if (err.message === 'Report not found') {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/reports/:id/download
 * Download the original PDF
 */
async function downloadReport(req, res, next) {
  try {
    const { id } = req.params;
    
    const fileInfo = await reportsService.getReportFilePath(id, req.userId);
    
    if (!fileInfo) {
      return notFound(res, 'Report not found');
    }
    
    // Check if file exists
    if (!fs.existsSync(fileInfo.path)) {
      return notFound(res, 'Report file not found on server');
    }
    
    // Send file
    res.download(fileInfo.path, fileInfo.name);
    
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/limits
 * Get current upload limits for user
 */
async function getUploadLimits(req, res, next) {
  try {
    const limits = await reportsService.checkReportLimit(req.userId);
    
    return success(res, { limits }, 'Upload limits retrieved');
    
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/reports/:id
 * Update report metadata (bureau, report date)
 */
async function updateReport(req, res, next) {
  try {
    const { id } = req.params;
    const { bureau, reportDate } = req.body;
    
    // Verify ownership
    const report = await reportsService.getReportById(id, req.userId);
    
    if (!report) {
      return notFound(res, 'Report not found');
    }
    
    // Update fields
    const prisma = require('../config/database');
    const updatedReport = await prisma.creditReport.update({
      where: { id },
      data: {
        ...(bureau && { bureau: bureau.toUpperCase() }),
        ...(reportDate && { reportDate: new Date(reportDate) }),
      },
      select: {
        id: true,
        fileName: true,
        bureau: true,
        reportDate: true,
        parseStatus: true,
        updatedAt: true,
      },
    });
    
    return success(res, { report: updatedReport }, 'Report updated successfully');
    
  } catch (err) {
    next(err);
  }
}

module.exports = {
  uploadReport,
  listReports,
  getReport,
  parseReport,
  deleteReport,
  downloadReport,
  getUploadLimits,
  updateReport,
};
