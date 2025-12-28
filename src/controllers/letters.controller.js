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
      letterType,
      target,
      bureau,
      customNotes,
      includeUserInfo,
      includeRecipient,
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
      'DEBT_VALIDATION',
      'METHOD_OF_VERIFICATION',
      'FOLLOW_UP',
      'GOODWILL',
      'EARLY_EXCLUSION',
    ];

    if (!validLetterTypes.includes(letterType)) {
      return error(res, `letterType must be one of: ${validLetterTypes.join(', ')}`, 400);
    }

    // Generate the letter
    const result = await lettersService.generateLetter({
      userId: req.userId,
      negativeItemId,
      letterType,
      target,
      bureau,
      customNotes,
      includeUserInfo: includeUserInfo || false,
      includeRecipient: includeRecipient || false,
    });

    return created(res, {
      letter: result.letter,
      completeLetter: result.completeLetter,
      letterType: result.letterType,
      target: result.target,
      bureau: result.bureau,
      metadata: result.metadata,
      userData: result.userData,
      recipientData: result.recipientData,
      itemData: result.itemData,
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
 * POST /api/letters/regenerate
 * Generate a new variation of the same letter
 */
async function regenerateLetter(req, res, next) {
  try {
    const {
      negativeItemId,
      letterType,
      target,
      bureau,
      customNotes,
    } = req.body;

    if (!negativeItemId || !letterType || !target) {
      return error(res, 'negativeItemId, letterType, and target are required', 400);
    }

    const result = await lettersService.regenerateLetter({
      userId: req.userId,
      negativeItemId,
      letterType,
      target,
      bureau,
      customNotes,
    });

    return success(res, {
      letter: result.letter,
      metadata: result.metadata,
    }, 'New variation generated');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/letters/types
 * Get list of available letter types with descriptions
 */
async function getLetterTypes(req, res, next) {
  try {
    const letterTypes = lettersService.getLetterTypes();
    return success(res, { letterTypes }, 'Letter types retrieved');
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/letters/recommend
 * Get recommended letter type for an item
 */
async function getRecommendation(req, res, next) {
  try {
    const { negativeItemId, target } = req.query;

    if (!negativeItemId) {
      return error(res, 'negativeItemId is required', 400);
    }

    // Get the negative item with dispute count
    const prisma = require('../config/database');
    const negativeItem = await prisma.negativeItem.findFirst({
      where: {
        id: negativeItemId,
        userId: req.userId,
      },
      include: {
        _count: {
          select: { disputes: true },
        },
      },
    });

    if (!negativeItem) {
      return notFound(res, 'Negative item not found');
    }

    const recommendation = lettersService.getRecommendedLetterType(
      negativeItem,
      negativeItem._count.disputes,
      target || 'BUREAU'
    );

    return success(res, {
      recommendation,
      item: {
        id: negativeItem.id,
        creditorName: negativeItem.creditorName,
        accountType: negativeItem.accountType,
        disputeCount: negativeItem._count.disputes,
      },
    }, 'Recommendation retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/letters/templates
 * Get available letter templates (for bundle downloads)
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
 * GET /api/letters/bureaus
 * Get bureau addresses
 */
async function getBureauAddresses(req, res, next) {
  try {
    const claudeService = require('../services/claude.service');
    
    return success(res, {
      bureaus: claudeService.BUREAU_ADDRESSES,
    }, 'Bureau addresses retrieved');

  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateLetter,
  regenerateLetter,
  getLetterTypes,
  getRecommendation,
  getTemplates,
  getTemplate,
  fillTemplate,
  getBureauAddresses,
};
