// ===========================================
// CREDITHOPPER - PARSER CONTROLLER
// ===========================================

const parserService = require('../services/parser.service');
const pdfService = require('../services/pdf.service');
const { success, error, notFound } = require('../utils/response');
const prisma = require('../config/database');

/**
 * POST /api/parser/extract-text
 * Extract raw text from a credit report PDF (for debugging)
 */
async function extractText(req, res, next) {
  try {
    const { reportId } = req.body;

    if (!reportId) {
      return error(res, 'reportId is required', 400);
    }

    // Get report
    const report = await prisma.creditReport.findFirst({
      where: { id: reportId, userId: req.userId },
    });

    if (!report) {
      return notFound(res, 'Report not found');
    }

    // Extract text
    const result = await pdfService.extractTextFromPDF(report.filePath);

    if (!result.success) {
      return error(res, 'Failed to extract text from PDF', 400);
    }

    return success(res, {
      reportId,
      numPages: result.numPages,
      textLength: result.text.length,
      preview: result.text.substring(0, 2000) + (result.text.length > 2000 ? '...' : ''),
    }, 'Text extracted successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parser/detect-bureau
 * Detect which bureau a report is from
 */
async function detectBureau(req, res, next) {
  try {
    const { reportId, text } = req.body;

    let textToAnalyze = text;

    if (reportId && !text) {
      // Get report
      const report = await prisma.creditReport.findFirst({
        where: { id: reportId, userId: req.userId },
      });

      if (!report) {
        return notFound(res, 'Report not found');
      }

      // Extract text if not already stored
      if (report.rawText) {
        textToAnalyze = report.rawText;
      } else {
        const result = await pdfService.extractTextFromPDF(report.filePath);
        textToAnalyze = result.text;
      }
    }

    if (!textToAnalyze) {
      return error(res, 'Either reportId or text is required', 400);
    }

    const bureau = parserService.detectBureau(textToAnalyze);

    return success(res, {
      bureau,
      confidence: bureau ? 'HIGH' : 'UNKNOWN',
    }, bureau ? `Detected bureau: ${bureau}` : 'Could not detect bureau');

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parser/parse-text
 * Parse raw text to extract negative items (manual input)
 */
async function parseText(req, res, next) {
  try {
    const { text, bureau } = req.body;

    if (!text) {
      return error(res, 'text is required', 400);
    }

    // Clean the text
    const cleanedText = pdfService.cleanText(text);

    // Detect bureau if not provided
    const detectedBureau = bureau || parserService.detectBureau(cleanedText);

    // Parse based on bureau
    let parsedData;
    switch (detectedBureau) {
      case 'EQUIFAX':
        parsedData = parserService.parseEquifaxReport(cleanedText);
        break;
      case 'EXPERIAN':
        parsedData = parserService.parseExperianReport(cleanedText);
        break;
      case 'TRANSUNION':
        parsedData = parserService.parseTransUnionReport(cleanedText);
        break;
      default:
        parsedData = parserService.parseGenericReport(cleanedText);
    }

    // Extract personal info
    const personalInfo = parserService.extractPersonalInfo(cleanedText);

    return success(res, {
      bureau: detectedBureau,
      personalInfo,
      reportDate: parsedData.reportDate,
      itemsFound: parsedData.negativeItems.length,
      items: parsedData.negativeItems,
    }, 'Text parsed successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parser/reparse
 * Re-parse a previously parsed report
 */
async function reparseReport(req, res, next) {
  try {
    const { reportId, deleteExistingItems } = req.body;

    if (!reportId) {
      return error(res, 'reportId is required', 400);
    }

    // Get report
    const report = await prisma.creditReport.findFirst({
      where: { id: reportId, userId: req.userId },
    });

    if (!report) {
      return notFound(res, 'Report not found');
    }

    // Optionally delete existing items from this report
    if (deleteExistingItems) {
      await prisma.negativeItem.deleteMany({
        where: { creditReportId: reportId },
      });
    }

    // Re-parse
    const result = await parserService.parseReport(reportId, req.userId);

    return success(res, {
      reportId,
      bureau: result.bureau,
      itemsFound: result.itemsFound,
      itemsCreated: result.itemsCreated,
      existingItemsDeleted: deleteExistingItems || false,
    }, 'Report re-parsed successfully');

  } catch (err) {
    if (err.message.includes('PDF') || err.message.includes('parse')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * GET /api/parser/supported-formats
 * Get information about supported report formats
 */
async function getSupportedFormats(req, res, next) {
  try {
    const formats = {
      bureaus: [
        {
          name: 'Equifax',
          code: 'EQUIFAX',
          supported: true,
          notes: 'Full support for standard Equifax credit reports',
        },
        {
          name: 'Experian',
          code: 'EXPERIAN',
          supported: true,
          notes: 'Full support for standard Experian credit reports',
        },
        {
          name: 'TransUnion',
          code: 'TRANSUNION',
          supported: true,
          notes: 'Full support for standard TransUnion credit reports',
        },
      ],
      fileTypes: [
        {
          type: 'PDF',
          mimeType: 'application/pdf',
          supported: true,
          maxSize: '50MB',
        },
      ],
      dataExtracted: [
        'Creditor/Company Name',
        'Account Number',
        'Account Type',
        'Balance/Amount Owed',
        'Original Balance',
        'Account Status',
        'Payment Status',
        'Date Opened',
        'Date Closed',
        'Date of First Delinquency',
        'Last Activity Date',
        'Last Reported Date',
      ],
      tips: [
        'Download reports directly from AnnualCreditReport.com for best results',
        'Ensure PDFs are not password protected',
        'Text-based PDFs work better than scanned documents',
        'If parsing fails, try manual entry for complex reports',
      ],
    };

    return success(res, { formats }, 'Supported formats retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parser/parse-account
 * Parse a single account block of text
 */
async function parseAccountBlock(req, res, next) {
  try {
    const { text } = req.body;

    if (!text) {
      return error(res, 'text is required', 400);
    }

    const item = parserService.parseAccountBlock(text);

    if (!item || !item.creditorName) {
      return error(res, 'Could not parse account information from provided text', 400);
    }

    return success(res, { item }, 'Account parsed successfully');

  } catch (err) {
    next(err);
  }
}

module.exports = {
  extractText,
  detectBureau,
  parseText,
  reparseReport,
  getSupportedFormats,
  parseAccountBlock,
};
