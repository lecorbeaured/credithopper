// ===========================================
// CREDITHOPPER - DISPUTES SERVICE
// ===========================================

const prisma = require('../config/database');
const config = require('../config');

// ===========================================
// CRUD OPERATIONS
// ===========================================

/**
 * Create a new dispute
 */
async function createDispute(userId, data) {
  const {
    negativeItemId,
    target,
    bureau,
    strategy,
    letterType,
    letterContent,
    customNotes,
  } = data;

  // Get the negative item
  const negativeItem = await prisma.negativeItem.findFirst({
    where: { id: negativeItemId, userId },
    include: {
      disputes: {
        orderBy: { round: 'desc' },
        take: 1,
      },
    },
  });

  if (!negativeItem) {
    throw new Error('Negative item not found');
  }

  // Determine round based on previous disputes
  const lastDispute = negativeItem.disputes[0];
  const round = lastDispute ? lastDispute.round + 1 : 1;

  if (round > 4) {
    throw new Error('Maximum dispute rounds (4) reached for this item');
  }

  // Calculate response due date
  const responseDueDate = new Date();
  if (target === 'BUREAU') {
    responseDueDate.setDate(responseDueDate.getDate() + config.dispute.bureauResponseDays);
  } else {
    responseDueDate.setDate(responseDueDate.getDate() + config.dispute.furnisherResponseDays);
  }

  // Create the dispute
  const dispute = await prisma.dispute.create({
    data: {
      userId,
      negativeItemId,
      round,
      target,
      bureau: target === 'BUREAU' ? bureau : null,
      strategy: strategy || getDefaultStrategy(round, target),
      letterType: letterType || getDefaultLetterType(round, target),
      letterContent,
      status: 'DRAFT',
      responseDueDate,
      customNotes,
    },
    include: {
      negativeItem: {
        select: {
          id: true,
          creditorName: true,
          accountType: true,
          balance: true,
        },
      },
    },
  });

  // Update negative item status
  await prisma.negativeItem.update({
    where: { id: negativeItemId },
    data: { status: 'DISPUTING' },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'DISPUTE_CREATED',
      description: `Created Round ${round} dispute for ${negativeItem.creditorName}`,
      entityType: 'dispute',
      entityId: dispute.id,
    },
  });

  return dispute;
}

/**
 * Get all disputes for a user
 */
async function getUserDisputes(userId, options = {}) {
  const {
    page = 1,
    limit = 50,
    status,
    target,
    negativeItemId,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * limit;

  const where = { userId };

  if (status) {
    where.status = status;
  }

  if (target) {
    where.target = target;
  }

  if (negativeItemId) {
    where.negativeItemId = negativeItemId;
  }

  const [disputes, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      include: {
        negativeItem: {
          select: {
            id: true,
            creditorName: true,
            accountType: true,
            balance: true,
            onEquifax: true,
            onExperian: true,
            onTransunion: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.dispute.count({ where }),
  ]);

  // Calculate stats
  const stats = await calculateDisputeStats(userId);

  return {
    disputes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    stats,
  };
}

/**
 * Get a single dispute by ID
 */
async function getDisputeById(disputeId, userId = null) {
  const where = { id: disputeId };
  if (userId) where.userId = userId;

  const dispute = await prisma.dispute.findFirst({
    where,
    include: {
      negativeItem: {
        include: {
          furnisher: true,
          creditReport: {
            select: {
              id: true,
              fileName: true,
              bureau: true,
            },
          },
        },
      },
    },
  });

  return dispute;
}

/**
 * Update a dispute
 */
async function updateDispute(disputeId, userId, data) {
  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId, userId },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Only allow certain updates based on status
  const allowedUpdates = getAllowedUpdates(dispute.status);
  const updateData = {};

  for (const [key, value] of Object.entries(data)) {
    if (allowedUpdates.includes(key)) {
      updateData[key] = value;
    }
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: updateData,
    include: {
      negativeItem: {
        select: {
          id: true,
          creditorName: true,
          accountType: true,
        },
      },
    },
  });

  return updated;
}

/**
 * Delete a dispute
 */
async function deleteDispute(disputeId, userId) {
  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId, userId },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  // Only allow deletion of drafts
  if (dispute.status !== 'DRAFT') {
    throw new Error('Only draft disputes can be deleted');
  }

  await prisma.dispute.delete({
    where: { id: disputeId },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'DISPUTE_DELETED',
      description: `Deleted draft dispute`,
      entityType: 'dispute',
      entityId: disputeId,
    },
  });

  return true;
}

// ===========================================
// STATUS MANAGEMENT
// ===========================================

/**
 * Mark dispute as mailed
 */
async function markAsMailed(disputeId, userId, mailedData = {}) {
  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId, userId },
    include: { negativeItem: true },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  if (dispute.status !== 'DRAFT' && dispute.status !== 'READY') {
    throw new Error('Dispute must be in DRAFT or READY status to mark as mailed');
  }

  const mailedAt = mailedData.mailedAt ? new Date(mailedData.mailedAt) : new Date();
  
  // Calculate response due date from mail date
  const responseDueDate = new Date(mailedAt);
  if (dispute.target === 'BUREAU') {
    responseDueDate.setDate(responseDueDate.getDate() + config.dispute.bureauResponseDays);
  } else {
    responseDueDate.setDate(responseDueDate.getDate() + config.dispute.furnisherResponseDays);
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: 'MAILED',
      mailedAt,
      mailedVia: mailedData.mailedVia || 'USPS',
      trackingNumber: mailedData.trackingNumber,
      responseDueDate,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'DISPUTE_MAILED',
      description: `Mailed Round ${dispute.round} dispute for ${dispute.negativeItem.creditorName}`,
      entityType: 'dispute',
      entityId: disputeId,
    },
  });

  return updated;
}

/**
 * Log a response from bureau/furnisher
 */
async function logResponse(disputeId, userId, responseData) {
  const {
    responseType,
    responseDate,
    responseNotes,
    responseDocumentPath,
  } = responseData;

  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId, userId },
    include: { negativeItem: true },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  if (dispute.status !== 'MAILED') {
    throw new Error('Dispute must be in MAILED status to log response');
  }

  // Validate response type
  const validResponseTypes = [
    'VERIFIED',       // Bureau verified the item
    'DELETED',        // Item was deleted
    'UPDATED',        // Item was updated/corrected
    'NO_RESPONSE',    // No response within timeframe
    'FRIVOLOUS',      // Marked as frivolous (rare)
    'PENDING',        // Still being investigated
  ];

  if (!validResponseTypes.includes(responseType)) {
    throw new Error(`Invalid response type. Must be one of: ${validResponseTypes.join(', ')}`);
  }

  // Update dispute
  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: responseType === 'PENDING' ? 'MAILED' : 'RESPONSE_RECEIVED',
      responseType,
      responseDate: responseDate ? new Date(responseDate) : new Date(),
      responseNotes,
      responseDocumentPath,
    },
  });

  // Update negative item based on response
  if (responseType === 'DELETED') {
    await handleDeletion(dispute, userId);
  } else if (responseType === 'VERIFIED') {
    // Item stays as DISPUTING, ready for next round
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'DISPUTE_RESPONSE_LOGGED',
      description: `Logged ${responseType} response for ${dispute.negativeItem.creditorName}`,
      entityType: 'dispute',
      entityId: disputeId,
    },
  });

  return updated;
}

/**
 * Mark dispute as complete
 */
async function markAsComplete(disputeId, userId, outcome = null) {
  const dispute = await prisma.dispute.findFirst({
    where: { id: disputeId, userId },
  });

  if (!dispute) {
    throw new Error('Dispute not found');
  }

  const updated = await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      status: 'COMPLETED',
      outcome: outcome || dispute.responseType,
      completedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Advance to next round
 */
async function advanceToNextRound(disputeId, userId) {
  const currentDispute = await prisma.dispute.findFirst({
    where: { id: disputeId, userId },
    include: { negativeItem: true },
  });

  if (!currentDispute) {
    throw new Error('Dispute not found');
  }

  if (currentDispute.status !== 'RESPONSE_RECEIVED' && currentDispute.status !== 'COMPLETED') {
    throw new Error('Current dispute must have a response before advancing');
  }

  if (currentDispute.round >= 4) {
    throw new Error('Maximum dispute rounds (4) reached');
  }

  // Mark current as complete
  await markAsComplete(disputeId, userId);

  // Create new dispute for next round
  const nextRound = currentDispute.round + 1;
  const nextStrategy = getDefaultStrategy(nextRound, currentDispute.target);
  const nextLetterType = getDefaultLetterType(nextRound, currentDispute.target);

  const newDispute = await createDispute(userId, {
    negativeItemId: currentDispute.negativeItemId,
    target: currentDispute.target,
    bureau: currentDispute.bureau,
    strategy: nextStrategy,
    letterType: nextLetterType,
    customNotes: `Advanced from Round ${currentDispute.round}. Previous response: ${currentDispute.responseType}`,
  });

  return newDispute;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Handle item deletion
 */
async function handleDeletion(dispute, userId) {
  const bureausAffected = [];
  if (dispute.bureau) {
    bureausAffected.push(dispute.bureau);
  }

  // Update negative item
  await prisma.negativeItem.update({
    where: { id: dispute.negativeItemId },
    data: {
      status: 'DELETED',
      // Update bureau flags if specific bureau deleted
      ...(dispute.bureau === 'EQUIFAX' && { onEquifax: false }),
      ...(dispute.bureau === 'EXPERIAN' && { onExperian: false }),
      ...(dispute.bureau === 'TRANSUNION' && { onTransunion: false }),
    },
  });

  // Create win record
  const negativeItem = await prisma.negativeItem.findUnique({
    where: { id: dispute.negativeItemId },
  });

  await prisma.win.create({
    data: {
      userId,
      negativeItemId: dispute.negativeItemId,
      disputeId: dispute.id,
      winType: 'FULL_DELETION',
      bureausAffected,
      debtEliminated: negativeItem.balance,
      achievedAt: new Date(),
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'WIN_RECORDED',
      description: `Item deleted: ${negativeItem.creditorName}`,
      entityType: 'win',
      entityId: negativeItem.id,
    },
  });
}

/**
 * Get default strategy based on round
 */
function getDefaultStrategy(round, target) {
  if (target === 'FURNISHER') {
    return 'DEBT_VALIDATION';
  }

  const strategies = {
    1: 'INITIAL_DISPUTE',
    2: 'METHOD_OF_VERIFICATION',
    3: 'PROCEDURAL_VIOLATION',
    4: 'LEGAL_ESCALATION',
  };

  return strategies[round] || 'INITIAL_DISPUTE';
}

/**
 * Get default letter type based on round
 */
function getDefaultLetterType(round, target) {
  if (target === 'FURNISHER') {
    return 'DEBT_VALIDATION';
  }

  const letterTypes = {
    1: 'INITIAL_DISPUTE',
    2: 'METHOD_OF_VERIFICATION',
    3: 'PROCEDURAL_VIOLATION',
    4: 'LEGAL_ESCALATION',
  };

  return letterTypes[round] || 'INITIAL_DISPUTE';
}

/**
 * Get allowed updates based on status
 */
function getAllowedUpdates(status) {
  const allowedByStatus = {
    DRAFT: ['letterContent', 'letterType', 'strategy', 'customNotes', 'target', 'bureau'],
    READY: ['letterContent', 'customNotes'],
    MAILED: ['trackingNumber', 'customNotes'],
    RESPONSE_RECEIVED: ['responseNotes', 'customNotes'],
    COMPLETED: ['customNotes'],
  };

  return allowedByStatus[status] || [];
}

/**
 * Calculate dispute stats for user
 */
async function calculateDisputeStats(userId) {
  const [total, drafts, mailed, responses, completed, wins] = await Promise.all([
    prisma.dispute.count({ where: { userId } }),
    prisma.dispute.count({ where: { userId, status: 'DRAFT' } }),
    prisma.dispute.count({ where: { userId, status: 'MAILED' } }),
    prisma.dispute.count({ where: { userId, status: 'RESPONSE_RECEIVED' } }),
    prisma.dispute.count({ where: { userId, status: 'COMPLETED' } }),
    prisma.win.count({ where: { userId } }),
  ]);

  // Get overdue disputes
  const overdue = await prisma.dispute.count({
    where: {
      userId,
      status: 'MAILED',
      responseDueDate: { lt: new Date() },
    },
  });

  return {
    total,
    drafts,
    mailed,
    responses,
    completed,
    overdue,
    wins,
    successRate: total > 0 ? Math.round((wins / total) * 100) : 0,
  };
}

/**
 * Get disputes requiring attention (overdue, etc.)
 */
async function getDisputesRequiringAttention(userId) {
  const now = new Date();

  // Overdue - past response due date
  const overdue = await prisma.dispute.findMany({
    where: {
      userId,
      status: 'MAILED',
      responseDueDate: { lt: now },
    },
    include: {
      negativeItem: {
        select: {
          id: true,
          creditorName: true,
        },
      },
    },
  });

  // Due soon - within 7 days
  const dueSoon = new Date();
  dueSoon.setDate(dueSoon.getDate() + 7);

  const upcoming = await prisma.dispute.findMany({
    where: {
      userId,
      status: 'MAILED',
      responseDueDate: {
        gte: now,
        lte: dueSoon,
      },
    },
    include: {
      negativeItem: {
        select: {
          id: true,
          creditorName: true,
        },
      },
    },
  });

  // Ready to advance - response received but not advanced
  const readyToAdvance = await prisma.dispute.findMany({
    where: {
      userId,
      status: 'RESPONSE_RECEIVED',
      responseType: 'VERIFIED',
      round: { lt: 4 },
    },
    include: {
      negativeItem: {
        select: {
          id: true,
          creditorName: true,
        },
      },
    },
  });

  return {
    overdue,
    upcoming,
    readyToAdvance,
    totalAttentionNeeded: overdue.length + readyToAdvance.length,
  };
}

/**
 * Get dispute timeline for an item
 */
async function getDisputeTimeline(negativeItemId, userId) {
  const disputes = await prisma.dispute.findMany({
    where: {
      negativeItemId,
      userId,
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      round: true,
      target: true,
      bureau: true,
      strategy: true,
      status: true,
      mailedAt: true,
      responseType: true,
      responseDate: true,
      outcome: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return disputes.map(dispute => ({
    ...dispute,
    daysToResponse: dispute.mailedAt && dispute.responseDate
      ? Math.ceil((new Date(dispute.responseDate) - new Date(dispute.mailedAt)) / (1000 * 60 * 60 * 24))
      : null,
  }));
}

module.exports = {
  createDispute,
  getUserDisputes,
  getDisputeById,
  updateDispute,
  deleteDispute,
  markAsMailed,
  logResponse,
  markAsComplete,
  advanceToNextRound,
  calculateDisputeStats,
  getDisputesRequiringAttention,
  getDisputeTimeline,
  getDefaultStrategy,
  getDefaultLetterType,
};
