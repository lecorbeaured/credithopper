// ===========================================
// CREDITHOPPER - DISPUTE SERVICE
// ===========================================
// Core dispute management: create, track, escalate, respond

const prisma = require('../config/database');
const timingService = require('./timing.service');
const letterService = require('./letter.service');

// ===========================================
// BUREAU ADDRESSES
// ===========================================

const BUREAU_ADDRESSES = {
  EQUIFAX: {
    name: 'Equifax Information Services LLC',
    street: 'P.O. Box 740256',
    city: 'Atlanta',
    state: 'GA',
    zip: '30374-0256',
    onlineUrl: 'https://www.equifax.com/personal/credit-report-services/credit-dispute/',
    phone: '1-866-349-5191',
  },
  EXPERIAN: {
    name: 'Experian',
    street: 'P.O. Box 4500',
    city: 'Allen',
    state: 'TX',
    zip: '75013',
    onlineUrl: 'https://www.experian.com/disputes/main.html',
    phone: '1-888-397-3742',
  },
  TRANSUNION: {
    name: 'TransUnion LLC Consumer Dispute Center',
    street: 'P.O. Box 2000',
    city: 'Chester',
    state: 'PA',
    zip: '19016',
    onlineUrl: 'https://www.transunion.com/credit-disputes/dispute-your-credit',
    phone: '1-800-916-8800',
  },
};

// ===========================================
// DISPUTE STRATEGIES BY ROUND
// ===========================================

const ROUND_STRATEGIES = {
  1: 'INITIAL_DISPUTE',
  2: 'METHOD_OF_VERIFICATION',
  3: 'PROCEDURAL_VIOLATION',
  4: 'LEGAL_ESCALATION',
};

// ===========================================
// CREATE NEW DISPUTE
// ===========================================

/**
 * Create a new dispute for a negative item
 * @param {Object} params - Dispute parameters
 * @returns {Object} Created dispute with letter
 */
async function createDispute(params) {
  const {
    userId,
    negativeItemId,
    target = 'BUREAU',
    bureau = null,
    furnisherId = null,
    disputeReasons = [],
    userContext = null,
    round = 1,
    strategy = null,
  } = params;
  
  // Get the negative item
  const negativeItem = await prisma.negativeItem.findUnique({
    where: { id: negativeItemId },
    include: { furnisher: true },
  });
  
  if (!negativeItem) {
    throw new Error('Negative item not found');
  }
  
  // Verify user owns this item
  if (negativeItem.userId !== userId) {
    throw new Error('Unauthorized');
  }
  
  // Determine bureau if not specified
  let targetBureau = bureau;
  if (target === 'BUREAU' && !targetBureau) {
    if (negativeItem.onEquifax) targetBureau = 'EQUIFAX';
    else if (negativeItem.onExperian) targetBureau = 'EXPERIAN';
    else if (negativeItem.onTransunion) targetBureau = 'TRANSUNION';
    else {
      throw new Error('No bureau specified and item not linked to any bureau');
    }
  }
  
  // Determine strategy based on round
  const disputeStrategy = strategy || ROUND_STRATEGIES[round] || 'INITIAL_DISPUTE';
  
  // Create the dispute
  const dispute = await prisma.dispute.create({
    data: {
      userId,
      negativeItemId,
      target,
      bureau: target === 'BUREAU' ? targetBureau : null,
      furnisherId: target === 'FURNISHER' ? (furnisherId || negativeItem.furnisherId) : null,
      round,
      strategy: disputeStrategy,
      status: 'DRAFT',
      // Store reasons and context as JSON in metadata
      // Note: You may want to add these fields to the schema
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
      description: `Created Round ${round} ${target.toLowerCase()} dispute for ${negativeItem.creditorName}`,
      entityType: 'dispute',
      entityId: dispute.id,
    },
  });
  
  return dispute;
}

// ===========================================
// DUAL-TRACK DISPUTE STRATEGY
// ===========================================

/**
 * Initiate dual-track dispute (bureau + furnisher simultaneously)
 * This puts maximum pressure on both parties
 * @param {string} negativeItemId - Negative item ID
 * @param {string} userId - User ID
 * @param {Object} options - Optional parameters
 * @returns {Object} Both dispute IDs and strategy explanation
 */
async function initiateDualTrackDispute(negativeItemId, userId, options = {}) {
  const { disputeReasons = [], userContext = null } = options;
  
  const negativeItem = await prisma.negativeItem.findUnique({
    where: { id: negativeItemId },
    include: { furnisher: true },
  });
  
  if (!negativeItem) {
    throw new Error('Negative item not found');
  }
  
  // Create bureau dispute
  const bureauDisputes = [];
  
  // Dispute with all bureaus where this item appears
  if (negativeItem.onEquifax) {
    const dispute = await createDispute({
      userId,
      negativeItemId,
      target: 'BUREAU',
      bureau: 'EQUIFAX',
      disputeReasons,
      userContext,
    });
    bureauDisputes.push({ bureau: 'EQUIFAX', disputeId: dispute.id });
  }
  
  if (negativeItem.onExperian) {
    const dispute = await createDispute({
      userId,
      negativeItemId,
      target: 'BUREAU',
      bureau: 'EXPERIAN',
      disputeReasons,
      userContext,
    });
    bureauDisputes.push({ bureau: 'EXPERIAN', disputeId: dispute.id });
  }
  
  if (negativeItem.onTransunion) {
    const dispute = await createDispute({
      userId,
      negativeItemId,
      target: 'BUREAU',
      bureau: 'TRANSUNION',
      disputeReasons,
      userContext,
    });
    bureauDisputes.push({ bureau: 'TRANSUNION', disputeId: dispute.id });
  }
  
  // Create furnisher dispute (debt validation) if furnisher exists
  let furnisherDispute = null;
  
  if (negativeItem.furnisherId || negativeItem.creditorName) {
    // Ensure furnisher exists in database
    let furnisher = negativeItem.furnisher;
    
    if (!furnisher && negativeItem.creditorName) {
      furnisher = await getOrCreateFurnisher(negativeItem.creditorName);
      
      // Link furnisher to negative item
      await prisma.negativeItem.update({
        where: { id: negativeItemId },
        data: { furnisherId: furnisher.id },
      });
    }
    
    if (furnisher) {
      const dispute = await createDispute({
        userId,
        negativeItemId,
        target: 'FURNISHER',
        furnisherId: furnisher.id,
        disputeReasons,
        userContext,
        strategy: 'DEBT_VALIDATION',
      });
      
      furnisherDispute = {
        furnisher: furnisher.name,
        furnisherId: furnisher.id,
        disputeId: dispute.id,
      };
    }
  }
  
  return {
    strategy: furnisherDispute ? 'DUAL_TRACK' : 'BUREAU_ONLY',
    bureauDisputes,
    furnisherDispute,
    totalDisputes: bureauDisputes.length + (furnisherDispute ? 1 : 0),
    explanation: furnisherDispute
      ? 'Disputing with both the credit bureaus and the original furnisher simultaneously applies maximum pressure. If one track succeeds, the other often follows.'
      : 'Disputing with bureaus only (furnisher information not available for direct dispute).',
  };
}

// ===========================================
// GET OR CREATE FURNISHER
// ===========================================

async function getOrCreateFurnisher(name) {
  // Try to find existing furnisher
  let furnisher = await prisma.furnisher.findFirst({
    where: {
      OR: [
        { name: { equals: name, mode: 'insensitive' } },
        { alternateName: { equals: name, mode: 'insensitive' } },
      ],
    },
  });
  
  if (!furnisher) {
    // Create new furnisher
    furnisher = await prisma.furnisher.create({
      data: {
        name,
        furnisherType: name.toLowerCase().includes('collection') 
          ? 'COLLECTION_AGENCY' 
          : 'CREDITOR',
      },
    });
  }
  
  return furnisher;
}

// ===========================================
// PROCESS DISPUTE RESPONSE
// ===========================================

/**
 * Process a response from bureau/furnisher
 * @param {string} disputeId - Dispute ID
 * @param {string} responseType - Type of response
 * @param {string} responseDetails - Details about the response
 * @returns {Object} Next steps recommendation
 */
async function processDisputeResponse(disputeId, responseType, responseDetails = '') {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { negativeItem: true },
  });
  
  if (!dispute) {
    throw new Error('Dispute not found');
  }
  
  // Update dispute with response
  const responseDue = dispute.responseDueDate ? new Date(dispute.responseDueDate) : null;
  const responseDate = new Date();
  const wasLate = responseDue && responseDate > responseDue;
  
  await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      responseReceived: true,
      responseDate,
      responseType,
      responseNotes: responseDetails + (wasLate ? '\n[LATE RESPONSE - Potential FCRA violation]' : ''),
      status: 'RESPONSE_RECEIVED',
    },
  });
  
  // Determine next action based on response type and round
  const nextSteps = determineNextSteps(dispute, responseType, wasLate);
  
  // Update negative item status based on response
  await updateItemBasedOnResponse(dispute.negativeItem, responseType);
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: dispute.userId,
      action: 'DISPUTE_RESPONSE',
      description: `Received ${responseType} response for ${dispute.negativeItem.creditorName}`,
      entityType: 'dispute',
      entityId: disputeId,
      metadata: { responseType, wasLate },
    },
  });
  
  // If deleted, record the win
  if (responseType === 'DELETED' || responseType === 'PARTIAL_DELETE') {
    await recordWin(dispute, responseType);
  }
  
  return nextSteps;
}

// ===========================================
// DETERMINE NEXT STEPS
// ===========================================

function determineNextSteps(dispute, responseType, wasLate) {
  const round = dispute.round;
  let nextAction = null;
  let nextRound = round + 1;
  let nextActionDate = null;
  let explanation = '';
  
  switch (responseType) {
    case 'DELETED':
      nextAction = 'CELEBRATE';
      explanation = '🎉 Success! The item has been deleted from your credit report. Check your other bureaus to ensure it\'s removed everywhere.';
      // Check if item is on other bureaus
      break;
      
    case 'PARTIAL_DELETE':
      nextAction = 'REVIEW_AND_CONTINUE';
      explanation = 'Some information was removed or updated. Review the changes and decide if you want to continue disputing the remaining issues.';
      nextActionDate = addDays(new Date(), 7);
      break;
      
    case 'VERIFIED':
      if (round === 1) {
        nextAction = 'SEND_MOV';
        explanation = 'They claim to have "verified" the item. Your next step is to send a Method of Verification letter demanding to know HOW they verified it and what documentation they have.';
        nextActionDate = addDays(new Date(), 3);
      } else if (round === 2) {
        nextAction = 'ESCALATE_ROUND';
        explanation = 'They verified again without providing real documentation. Time to escalate with a letter citing FCRA procedural requirements.';
        nextActionDate = addDays(new Date(), 3);
      } else if (round === 3) {
        nextAction = 'FINAL_DEMAND';
        explanation = 'Multiple verifications without proper documentation. Send a final demand letter with specific FCRA citations and clear consequences.';
        nextActionDate = addDays(new Date(), 3);
      } else {
        nextAction = 'FILE_COMPLAINT';
        explanation = 'Four rounds of disputes without resolution. Consider filing complaints with the CFPB and your State Attorney General.';
        nextActionDate = addDays(new Date(), 7);
      }
      break;
      
    case 'UPDATED':
      nextAction = 'REVIEW_CHANGES';
      explanation = 'The bureau updated some information but didn\'t delete the item. Review the updated credit report to see what changed, then decide if you want to continue disputing.';
      nextActionDate = addDays(new Date(), 7);
      break;
      
    case 'NO_RESPONSE':
      nextAction = 'VIOLATION_NOTICE';
      if (wasLate || !dispute.responseDueDate) {
        explanation = '⚠️ The bureau failed to respond within the legally required 30 days. This is a FCRA violation. Your next letter should document this violation and demand immediate deletion.';
      } else {
        explanation = 'No response received. Send a follow-up letter noting the lack of response and demanding action.';
      }
      nextActionDate = addDays(new Date(), 3);
      break;
      
    case 'FRIVOLOUS':
      nextAction = 'CHALLENGE_FRIVOLOUS';
      explanation = 'The bureau claimed your dispute is "frivolous" to avoid investigating. This is often improper. Send a letter challenging this determination with specific details about why your dispute is legitimate.';
      nextActionDate = addDays(new Date(), 3);
      break;
      
    case 'INVESTIGATING':
      nextAction = 'WAIT';
      explanation = 'The bureau says they\'re still investigating. They have 30 days total (45 if you provided additional information). Mark your calendar and follow up if they miss the deadline.';
      nextActionDate = addDays(new Date(), 14);
      break;
      
    default:
      nextAction = 'REVIEW';
      explanation = 'Review the response and determine your next course of action.';
      nextActionDate = addDays(new Date(), 7);
  }
  
  return {
    currentRound: round,
    responseType,
    wasLate,
    nextAction,
    nextRound: nextAction === 'CELEBRATE' ? null : nextRound,
    nextActionDate,
    explanation,
    canEscalate: round < 4 && responseType !== 'DELETED',
    canFileComplaint: round >= 2,
    suggestedStrategy: nextRound <= 4 ? ROUND_STRATEGIES[nextRound] : 'LEGAL_ESCALATION',
  };
}

// ===========================================
// UPDATE ITEM BASED ON RESPONSE
// ===========================================

async function updateItemBasedOnResponse(negativeItem, responseType) {
  let newStatus = negativeItem.status;
  
  switch (responseType) {
    case 'DELETED':
      newStatus = 'DELETED';
      break;
    case 'VERIFIED':
      newStatus = 'VERIFIED';
      break;
    case 'UPDATED':
    case 'PARTIAL_DELETE':
      newStatus = 'UPDATED';
      break;
    default:
      newStatus = 'DISPUTING';
  }
  
  await prisma.negativeItem.update({
    where: { id: negativeItem.id },
    data: { status: newStatus },
  });
}

// ===========================================
// RECORD WIN
// ===========================================

async function recordWin(dispute, responseType) {
  const negativeItem = dispute.negativeItem;
  
  const winType = responseType === 'DELETED' ? 'FULL_DELETION' : 'PARTIAL_DELETION';
  
  await prisma.win.create({
    data: {
      userId: dispute.userId,
      negativeItemId: negativeItem.id,
      winType,
      bureausAffected: dispute.bureau ? [dispute.bureau] : [],
      debtEliminated: negativeItem.balance,
      roundAchieved: dispute.round,
      description: `${winType === 'FULL_DELETION' ? 'Successfully deleted' : 'Partially updated'} ${negativeItem.creditorName} from ${dispute.bureau || 'furnisher'}`,
    },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: dispute.userId,
      action: 'WIN_RECORDED',
      description: `🎉 ${winType}: ${negativeItem.creditorName}`,
      entityType: 'win',
      entityId: dispute.id,
    },
  });
}

// ===========================================
// ESCALATE DISPUTE TO NEXT ROUND
// ===========================================

/**
 * Create next round dispute based on previous
 * @param {string} previousDisputeId - Previous dispute ID
 * @returns {Object} New dispute
 */
async function escalateDispute(previousDisputeId) {
  const previousDispute = await prisma.dispute.findUnique({
    where: { id: previousDisputeId },
    include: { negativeItem: true },
  });
  
  if (!previousDispute) {
    throw new Error('Previous dispute not found');
  }
  
  if (previousDispute.round >= 4) {
    throw new Error('Maximum dispute rounds reached. Consider filing a regulatory complaint.');
  }
  
  // Mark previous as escalated
  await prisma.dispute.update({
    where: { id: previousDisputeId },
    data: { status: 'ESCALATED' },
  });
  
  // Create new dispute for next round
  const newRound = previousDispute.round + 1;
  
  const newDispute = await createDispute({
    userId: previousDispute.userId,
    negativeItemId: previousDispute.negativeItemId,
    target: previousDispute.target,
    bureau: previousDispute.bureau,
    furnisherId: previousDispute.furnisherId,
    round: newRound,
    strategy: ROUND_STRATEGIES[newRound],
  });
  
  return newDispute;
}

// ===========================================
// MARK DISPUTE AS MAILED
// ===========================================

async function markDisputeMailed(disputeId, mailedMethod, trackingNumber = null) {
  const mailedAt = new Date();
  const responseDueDate = addDays(mailedAt, 30); // 30 days for bureau response
  
  await prisma.dispute.update({
    where: { id: disputeId },
    data: {
      mailedAt,
      mailedMethod,
      trackingNumber,
      responseDueDate,
      status: 'MAILED',
    },
  });
  
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: { negativeItem: true },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: dispute.userId,
      action: 'DISPUTE_SENT',
      description: `Mailed Round ${dispute.round} dispute for ${dispute.negativeItem.creditorName} via ${mailedMethod}`,
      entityType: 'dispute',
      entityId: disputeId,
    },
  });
  
  return {
    mailedAt,
    responseDueDate,
    daysUntilResponse: 30,
  };
}

// ===========================================
// CHECK FOR OVERDUE RESPONSES
// ===========================================

/**
 * Find disputes where response deadline has passed
 * @returns {Array} Overdue disputes
 */
async function checkOverdueResponses() {
  const today = new Date();
  
  const overdueDisputes = await prisma.dispute.findMany({
    where: {
      status: 'MAILED',
      responseReceived: false,
      responseDueDate: { lt: today },
    },
    include: {
      negativeItem: true,
      user: { select: { id: true, email: true, firstName: true } },
    },
  });
  
  return overdueDisputes.map(dispute => ({
    disputeId: dispute.id,
    userId: dispute.userId,
    userEmail: dispute.user.email,
    userName: dispute.user.firstName,
    creditorName: dispute.negativeItem.creditorName,
    bureau: dispute.bureau,
    mailedAt: dispute.mailedAt,
    responseDueDate: dispute.responseDueDate,
    daysOverdue: Math.floor((today - new Date(dispute.responseDueDate)) / (1000 * 60 * 60 * 24)),
    recommendation: 'Mark as NO_RESPONSE and escalate with violation notice',
  }));
}

// ===========================================
// GET USER DISPUTES SUMMARY
// ===========================================

async function getUserDisputesSummary(userId) {
  const disputes = await prisma.dispute.findMany({
    where: { userId },
    include: { negativeItem: true },
    orderBy: { createdAt: 'desc' },
  });
  
  const summary = {
    total: disputes.length,
    byStatus: {
      draft: disputes.filter(d => d.status === 'DRAFT').length,
      ready: disputes.filter(d => d.status === 'READY').length,
      mailed: disputes.filter(d => d.status === 'MAILED').length,
      responded: disputes.filter(d => d.status === 'RESPONSE_RECEIVED').length,
      completed: disputes.filter(d => d.status === 'COMPLETED').length,
      escalated: disputes.filter(d => d.status === 'ESCALATED').length,
    },
    byOutcome: {
      deleted: disputes.filter(d => d.responseType === 'DELETED').length,
      verified: disputes.filter(d => d.responseType === 'VERIFIED').length,
      updated: disputes.filter(d => d.responseType === 'UPDATED').length,
      noResponse: disputes.filter(d => d.responseType === 'NO_RESPONSE').length,
      pending: disputes.filter(d => !d.responseType && d.status !== 'DRAFT').length,
    },
    successRate: disputes.length > 0
      ? Math.round((disputes.filter(d => d.responseType === 'DELETED' || d.responseType === 'PARTIAL_DELETE').length / disputes.length) * 100)
      : 0,
    awaitingResponse: disputes.filter(d => d.status === 'MAILED' && !d.responseReceived),
    overdueResponses: disputes.filter(d => 
      d.status === 'MAILED' && 
      !d.responseReceived && 
      d.responseDueDate && 
      new Date(d.responseDueDate) < new Date()
    ),
  };
  
  return {
    summary,
    disputes,
  };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  createDispute,
  initiateDualTrackDispute,
  processDisputeResponse,
  escalateDispute,
  markDisputeMailed,
  checkOverdueResponses,
  getUserDisputesSummary,
  getOrCreateFurnisher,
  BUREAU_ADDRESSES,
  ROUND_STRATEGIES,
};
