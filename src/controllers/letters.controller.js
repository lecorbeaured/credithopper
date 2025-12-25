// ===========================================
// CREDITHOPPER - LETTERS CONTROLLER
// ===========================================

const lettersService = require('../services/letters.service');
const { success, created, error, notFound, forbidden } = require('../utils/response');

/**
 * POST /api/letters/generate
 * Generate a dispute letter using AI
 */
async function generateLetter(req, res, next) {
  try {
    const {
      negativeItemId,
      disputeId,
      letterType,
      target,
      bureau,
      round,
      customInstructions,
    } = req.body;

    // Validate required fields
    if (!negativeItemId) {
      return error(res, 'negativeItemId is required', 400);
    }

    if (!letterType) {
      return error(res, 'letterType is required', 400);
    }

    if (!target || !['BUREAU', 'FURNISHER'].includes(target)) {
      return error(res, 'target must be BUREAU or FURNISHER', 400);
    }

    if (target === 'BUREAU' && !bureau) {
      return error(res, 'bureau is required when target is BUREAU', 400);
    }

    // Validate bureau value
    if (bureau && !['EQUIFAX', 'EXPERIAN', 'TRANSUNION'].includes(bureau)) {
      return error(res, 'bureau must be EQUIFAX, EXPERIAN, or TRANSUNION', 400);
    }

    // Validate letter type
    const validLetterTypes = [
      'INITIAL_DISPUTE',
      'METHOD_OF_VERIFICATION',
      'PROCEDURAL_VIOLATION',
      'LEGAL_ESCALATION',
      'DEBT_VALIDATION',
      'GOODWILL',
      'IDENTITY_THEFT',
    ];

    if (!validLetterTypes.includes(letterType)) {
      return error(res, `letterType must be one of: ${validLetterTypes.join(', ')}`, 400);
    }

    // Generate the letter
    const result = await lettersService.generateLetter({
      userId: req.userId,
      negativeItemId,
      disputeId,
      letterType,
      target,
      bureau,
      round: round || 1,
      customInstructions,
    });

    return created(res, {
      letter: result.letter,
      metadata: result.metadata,
    }, 'Letter generated successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    if (err.message.includes('API key') || err.message.includes('Rate limit')) {
      return error(res, err.message, 503);
    }
    next(err);
  }
}

/**
 * GET /api/letters/templates
 * Get available letter templates
 */
async function getTemplates(req, res, next) {
  try {
    const { category, targetType, accountType, round, premium } = req.query;

    const templates = await lettersService.getTemplates({
      category,
      targetType,
      accountType,
      round: round ? parseInt(round) : undefined,
      isPremium: premium === 'true' ? true : premium === 'false' ? false : undefined,
    });

    // Filter premium templates based on subscription
    const user = req.user;
    const filteredTemplates = templates.map(template => {
      if (template.isPremium && user.subscriptionTier === 'FREE') {
        return {
          ...template,
          locked: true,
          lockReason: 'Upgrade to access premium templates',
        };
      }
      return { ...template, locked: false };
    });

    return success(res, { templates: filteredTemplates }, 'Templates retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/letters/templates/:id
 * Get a specific template
 */
async function getTemplate(req, res, next) {
  try {
    const { id } = req.params;

    const template = await lettersService.getTemplate(id);

    // Check if premium template and user has access
    if (template.isPremium && req.user.subscriptionTier === 'FREE') {
      return forbidden(res, 'Upgrade to access premium templates');
    }

    return success(res, { template }, 'Template retrieved successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * POST /api/letters/fill-template
 * Fill a template with user and item data
 */
async function fillTemplate(req, res, next) {
  try {
    const { templateId, negativeItemId, bureau, customData } = req.body;

    if (!templateId) {
      return error(res, 'templateId is required', 400);
    }

    if (!negativeItemId) {
      return error(res, 'negativeItemId is required', 400);
    }

    const result = await lettersService.fillTemplate(
      templateId,
      req.userId,
      negativeItemId,
      { bureau, ...customData }
    );

    return success(res, result, 'Template filled successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/letters/recommend
 * Get recommended letter type for an item
 */
async function getRecommendation(req, res, next) {
  try {
    const { negativeItemId, round, target } = req.query;

    if (!negativeItemId) {
      return error(res, 'negativeItemId is required', 400);
    }

    // Get the negative item
    const prisma = require('../config/database');
    const negativeItem = await prisma.negativeItem.findFirst({
      where: {
        id: negativeItemId,
        userId: req.userId,
      },
    });

    if (!negativeItem) {
      return notFound(res, 'Negative item not found');
    }

    const recommendation = lettersService.getRecommendedLetterType(
      negativeItem,
      parseInt(round) || 1,
      target || 'BUREAU'
    );

    return success(res, {
      recommendation,
      item: {
        id: negativeItem.id,
        creditorName: negativeItem.creditorName,
        accountType: negativeItem.accountType,
      },
    }, 'Recommendation retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/letters/types
 * Get list of available letter types with descriptions
 */
async function getLetterTypes(req, res, next) {
  try {
    const letterTypes = [
      {
        type: 'INITIAL_DISPUTE',
        name: 'Initial Dispute',
        description: 'First dispute letter requesting investigation and verification',
        round: 1,
        target: 'BUREAU',
      },
      {
        type: 'METHOD_OF_VERIFICATION',
        name: 'Method of Verification',
        description: 'Demand proof of how the bureau verified the account',
        round: 2,
        target: 'BUREAU',
      },
      {
        type: 'PROCEDURAL_VIOLATION',
        name: 'Procedural Violation',
        description: 'Cite specific FCRA violations and demand correction',
        round: 3,
        target: 'BUREAU',
      },
      {
        type: 'LEGAL_ESCALATION',
        name: 'Legal Escalation',
        description: 'Final demand with legal action warning',
        round: 4,
        target: 'BUREAU',
      },
      {
        type: 'DEBT_VALIDATION',
        name: 'Debt Validation',
        description: 'Request complete validation of debt from collector',
        round: 1,
        target: 'FURNISHER',
      },
      {
        type: 'GOODWILL',
        name: 'Goodwill Request',
        description: 'Ask creditor to remove negative mark as a courtesy',
        round: 1,
        target: 'FURNISHER',
      },
      {
        type: 'IDENTITY_THEFT',
        name: 'Identity Theft Dispute',
        description: 'Dispute fraudulent accounts due to identity theft',
        round: 1,
        target: 'BUREAU',
      },
    ];

    return success(res, { letterTypes }, 'Letter types retrieved');

  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateLetter,
  getTemplates,
  getTemplate,
  fillTemplate,
  getRecommendation,
  getLetterTypes,
};
