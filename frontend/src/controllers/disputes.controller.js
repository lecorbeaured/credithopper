// ===========================================
// CREDITHOPPER - DISPUTES CONTROLLER
// ===========================================

const disputesService = require('../services/disputes.service');
const lettersService = require('../services/letters.service');
const { success, created, error, notFound } = require('../utils/response');

/**
 * POST /api/disputes
 * Create a new dispute
 */
async function createDispute(req, res, next) {
  try {
    const {
      negativeItemId,
      target,
      bureau,
      strategy,
      letterType,
      letterContent,
      customNotes,
    } = req.body;

    // Validate required fields
    if (!negativeItemId) {
      return error(res, 'negativeItemId is required', 400);
    }

    if (!target || !['BUREAU', 'FURNISHER'].includes(target)) {
      return error(res, 'target must be BUREAU or FURNISHER', 400);
    }

    if (target === 'BUREAU' && !bureau) {
      return error(res, 'bureau is required when target is BUREAU', 400);
    }

    if (bureau && !['EQUIFAX', 'EXPERIAN', 'TRANSUNION'].includes(bureau)) {
      return error(res, 'bureau must be EQUIFAX, EXPERIAN, or TRANSUNION', 400);
    }

    const dispute = await disputesService.createDispute(req.userId, {
      negativeItemId,
      target,
      bureau,
      strategy,
      letterType,
      letterContent,
      customNotes,
    });

    return created(res, { dispute }, 'Dispute created successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    if (err.message.includes('Maximum')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * GET /api/disputes
 * List all disputes for current user
 */
async function listDisputes(req, res, next) {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      target,
      negativeItemId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const result = await disputesService.getUserDisputes(req.userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      status,
      target,
      negativeItemId,
      sortBy,
      sortOrder,
    });

    return success(res, result, 'Disputes retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/disputes/attention
 * Get disputes requiring attention
 */
async function getAttention(req, res, next) {
  try {
    const attention = await disputesService.getDisputesRequiringAttention(req.userId);

    return success(res, { attention }, 'Attention items retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/disputes/stats
 * Get dispute statistics
 */
async function getStats(req, res, next) {
  try {
    const stats = await disputesService.calculateDisputeStats(req.userId);

    return success(res, { stats }, 'Stats retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/disputes/:id
 * Get a single dispute
 */
async function getDispute(req, res, next) {
  try {
    const { id } = req.params;

    const dispute = await disputesService.getDisputeById(id, req.userId);

    if (!dispute) {
      return notFound(res, 'Dispute not found');
    }

    return success(res, { dispute }, 'Dispute retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/disputes/:id
 * Update a dispute
 */
async function updateDispute(req, res, next) {
  try {
    const { id } = req.params;

    const dispute = await disputesService.updateDispute(id, req.userId, req.body);

    return success(res, { dispute }, 'Dispute updated successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * DELETE /api/disputes/:id
 * Delete a draft dispute
 */
async function deleteDispute(req, res, next) {
  try {
    const { id } = req.params;

    await disputesService.deleteDispute(id, req.userId);

    return success(res, null, 'Dispute deleted successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    if (err.message.includes('Only draft')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * POST /api/disputes/:id/generate-letter
 * Generate a letter for this dispute
 */
async function generateLetter(req, res, next) {
  try {
    const { id } = req.params;
    const { customInstructions } = req.body;

    const dispute = await disputesService.getDisputeById(id, req.userId);

    if (!dispute) {
      return notFound(res, 'Dispute not found');
    }

    // Generate letter
    const result = await lettersService.generateLetter({
      userId: req.userId,
      negativeItemId: dispute.negativeItemId,
      disputeId: id,
      letterType: dispute.letterType,
      target: dispute.target,
      bureau: dispute.bureau,
      round: dispute.round,
      customInstructions,
    });

    // Save letter content to dispute
    await disputesService.updateDispute(id, req.userId, {
      letterContent: result.letter,
    });

    return success(res, {
      letter: result.letter,
      metadata: result.metadata,
    }, 'Letter generated successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    if (err.message.includes('API')) {
      return error(res, err.message, 503);
    }
    next(err);
  }
}

/**
 * POST /api/disputes/:id/mail
 * Mark dispute as mailed
 */
async function markAsMailed(req, res, next) {
  try {
    const { id } = req.params;
    const { mailedAt, mailedVia, trackingNumber } = req.body;

    const dispute = await disputesService.markAsMailed(id, req.userId, {
      mailedAt,
      mailedVia,
      trackingNumber,
    });

    return success(res, { dispute }, 'Dispute marked as mailed');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    if (err.message.includes('status')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * POST /api/disputes/:id/response
 * Log a response from bureau/furnisher
 */
async function logResponse(req, res, next) {
  try {
    const { id } = req.params;
    const {
      responseType,
      responseDate,
      responseNotes,
      responseDocumentPath,
    } = req.body;

    if (!responseType) {
      return error(res, 'responseType is required', 400);
    }

    const dispute = await disputesService.logResponse(id, req.userId, {
      responseType,
      responseDate,
      responseNotes,
      responseDocumentPath,
    });

    return success(res, { dispute }, 'Response logged successfully');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    if (err.message.includes('status') || err.message.includes('Invalid')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * POST /api/disputes/:id/advance
 * Advance to next dispute round
 */
async function advanceRound(req, res, next) {
  try {
    const { id } = req.params;

    const newDispute = await disputesService.advanceToNextRound(id, req.userId);

    return created(res, { dispute: newDispute }, `Advanced to Round ${newDispute.round}`);

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    if (err.message.includes('Maximum') || err.message.includes('must have')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * POST /api/disputes/:id/complete
 * Mark dispute as complete
 */
async function markAsComplete(req, res, next) {
  try {
    const { id } = req.params;
    const { outcome } = req.body;

    const dispute = await disputesService.markAsComplete(id, req.userId, outcome);

    return success(res, { dispute }, 'Dispute marked as complete');

  } catch (err) {
    if (err.message.includes('not found')) {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/disputes/item/:itemId/timeline
 * Get dispute timeline for an item
 */
async function getTimeline(req, res, next) {
  try {
    const { itemId } = req.params;

    const timeline = await disputesService.getDisputeTimeline(itemId, req.userId);

    return success(res, { timeline }, 'Timeline retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/disputes/response-types
 * Get list of valid response types
 */
async function getResponseTypes(req, res, next) {
  try {
    const responseTypes = [
      {
        value: 'VERIFIED',
        label: 'Verified',
        description: 'Bureau verified the item remains accurate',
        nextAction: 'Advance to next round',
      },
      {
        value: 'DELETED',
        label: 'Deleted',
        description: 'Item was removed from your credit report',
        nextAction: 'Celebrate! Verify removal on all bureaus',
      },
      {
        value: 'UPDATED',
        label: 'Updated',
        description: 'Information was corrected but item remains',
        nextAction: 'Review changes and decide next steps',
      },
      {
        value: 'NO_RESPONSE',
        label: 'No Response',
        description: 'No response received within legal timeframe',
        nextAction: 'File complaint with CFPB',
      },
      {
        value: 'FRIVOLOUS',
        label: 'Marked Frivolous',
        description: 'Bureau deemed dispute frivolous (rare)',
        nextAction: 'Provide additional documentation',
      },
      {
        value: 'PENDING',
        label: 'Still Pending',
        description: 'Investigation still in progress',
        nextAction: 'Wait for final response',
      },
    ];

    return success(res, { responseTypes }, 'Response types retrieved');

  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDispute,
  listDisputes,
  getAttention,
  getStats,
  getDispute,
  updateDispute,
  deleteDispute,
  generateLetter,
  markAsMailed,
  logResponse,
  advanceRound,
  markAsComplete,
  getTimeline,
  getResponseTypes,
};
