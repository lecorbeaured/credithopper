// ===========================================
// CREDITHOPPER - NEGATIVE ITEMS SERVICE
// ===========================================

const prisma = require('../config/database');

// ===========================================
// CRUD OPERATIONS
// ===========================================

/**
 * Create a new negative item
 */
async function createItem(userId, data) {
  const {
    creditReportId,
    creditorName,
    originalCreditor,
    accountNumber,
    accountNumberMasked,
    accountType,
    balance,
    originalBalance,
    highCredit,
    creditLimit,
    monthlyPayment,
    accountStatus,
    paymentStatus,
    dateOpened,
    dateClosed,
    dateOfFirstDelinquency,
    lastActivityDate,
    lastReportedDate,
    onEquifax,
    onExperian,
    onTransunion,
    notes,
  } = data;

  // Calculate fall-off date and recommendation
  const calculations = calculateItemMetrics({
    dateOfFirstDelinquency,
    lastActivityDate,
    accountType,
  });

  const item = await prisma.negativeItem.create({
    data: {
      userId,
      creditReportId,
      creditorName,
      originalCreditor,
      accountNumber,
      accountNumberMasked: accountNumberMasked || maskAccountNumber(accountNumber),
      accountType,
      balance: balance ? parseFloat(balance) : null,
      originalBalance: originalBalance ? parseFloat(originalBalance) : null,
      highCredit: highCredit ? parseFloat(highCredit) : null,
      creditLimit: creditLimit ? parseFloat(creditLimit) : null,
      monthlyPayment: monthlyPayment ? parseFloat(monthlyPayment) : null,
      accountStatus,
      paymentStatus,
      dateOpened: dateOpened ? new Date(dateOpened) : null,
      dateClosed: dateClosed ? new Date(dateClosed) : null,
      dateOfFirstDelinquency: dateOfFirstDelinquency ? new Date(dateOfFirstDelinquency) : null,
      lastActivityDate: lastActivityDate ? new Date(lastActivityDate) : null,
      lastReportedDate: lastReportedDate ? new Date(lastReportedDate) : null,
      onEquifax: onEquifax || false,
      onExperian: onExperian || false,
      onTransunion: onTransunion || false,
      fallsOffDate: calculations.fallsOffDate,
      monthsUntilFallsOff: calculations.monthsUntilFallsOff,
      recommendation: calculations.recommendation,
      recommendationReason: calculations.recommendationReason,
      status: 'ACTIVE',
      notes,
    },
    include: {
      furnisher: true,
      _count: {
        select: { disputes: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'ITEM_ADDED',
      description: `Added negative item: ${creditorName}`,
      entityType: 'negative_item',
      entityId: item.id,
    },
  });

  return {
    ...item,
    disputeCount: item._count.disputes,
    _count: undefined,
  };
}

/**
 * Get all negative items for a user
 */
async function getUserItems(userId, options = {}) {
  const {
    page = 1,
    limit = 50,
    status,
    accountType,
    bureau,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    search,
  } = options;

  const skip = (page - 1) * limit;

  // Build where clause
  const where = { userId };

  if (status) {
    where.status = status;
  }

  if (accountType) {
    where.accountType = accountType;
  }

  if (bureau) {
    if (bureau === 'EQUIFAX') where.onEquifax = true;
    if (bureau === 'EXPERIAN') where.onExperian = true;
    if (bureau === 'TRANSUNION') where.onTransunion = true;
  }

  if (search) {
    where.OR = [
      { creditorName: { contains: search, mode: 'insensitive' } },
      { originalCreditor: { contains: search, mode: 'insensitive' } },
      { accountNumber: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Valid sort fields
  const validSortFields = ['createdAt', 'creditorName', 'balance', 'fallsOffDate', 'accountType'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

  const [items, total] = await Promise.all([
    prisma.negativeItem.findMany({
      where,
      include: {
        furnisher: {
          select: {
            id: true,
            name: true,
            furnisherType: true,
          },
        },
        _count: {
          select: { disputes: true, wins: true },
        },
      },
      orderBy: { [orderField]: sortOrder },
      skip,
      take: limit,
    }),
    prisma.negativeItem.count({ where }),
  ]);

  // Calculate summary stats
  const stats = await calculateUserStats(userId);

  return {
    items: items.map(item => ({
      ...item,
      disputeCount: item._count.disputes,
      winCount: item._count.wins,
      _count: undefined,
    })),
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
 * Get a single item by ID
 */
async function getItemById(itemId, userId = null) {
  const where = { id: itemId };
  if (userId) where.userId = userId;

  const item = await prisma.negativeItem.findFirst({
    where,
    include: {
      furnisher: true,
      creditReport: {
        select: {
          id: true,
          fileName: true,
          bureau: true,
          reportDate: true,
        },
      },
      disputes: {
        select: {
          id: true,
          round: true,
          strategy: true,
          status: true,
          mailedAt: true,
          responseType: true,
          responseDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      wins: {
        select: {
          id: true,
          winType: true,
          bureausAffected: true,
          debtEliminated: true,
          achievedAt: true,
        },
      },
    },
  });

  if (!item) {
    return null;
  }

  return item;
}

/**
 * Update a negative item
 */
async function updateItem(itemId, userId, data) {
  // Verify ownership
  const existing = await prisma.negativeItem.findFirst({
    where: { id: itemId, userId },
  });

  if (!existing) {
    throw new Error('Item not found');
  }

  // Recalculate metrics if relevant dates changed
  let calculations = {};
  if (data.dateOfFirstDelinquency || data.lastActivityDate || data.accountType) {
    calculations = calculateItemMetrics({
      dateOfFirstDelinquency: data.dateOfFirstDelinquency || existing.dateOfFirstDelinquency,
      lastActivityDate: data.lastActivityDate || existing.lastActivityDate,
      accountType: data.accountType || existing.accountType,
    });
  }

  const updateData = {};

  // Only update provided fields
  const allowedFields = [
    'creditorName', 'originalCreditor', 'accountNumber', 'accountNumberMasked',
    'accountType', 'balance', 'originalBalance', 'highCredit', 'creditLimit',
    'monthlyPayment', 'accountStatus', 'paymentStatus', 'dateOpened', 'dateClosed',
    'dateOfFirstDelinquency', 'lastActivityDate', 'lastReportedDate',
    'onEquifax', 'onExperian', 'onTransunion', 'status', 'notes', 'furnisherId',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      // Handle dates
      if (['dateOpened', 'dateClosed', 'dateOfFirstDelinquency', 'lastActivityDate', 'lastReportedDate'].includes(field)) {
        updateData[field] = data[field] ? new Date(data[field]) : null;
      }
      // Handle decimals
      else if (['balance', 'originalBalance', 'highCredit', 'creditLimit', 'monthlyPayment'].includes(field)) {
        updateData[field] = data[field] ? parseFloat(data[field]) : null;
      }
      // Handle account number masking
      else if (field === 'accountNumber') {
        updateData.accountNumber = data[field];
        updateData.accountNumberMasked = data.accountNumberMasked || maskAccountNumber(data[field]);
      }
      else {
        updateData[field] = data[field];
      }
    }
  }

  // Add calculated fields
  if (calculations.fallsOffDate) {
    updateData.fallsOffDate = calculations.fallsOffDate;
    updateData.monthsUntilFallsOff = calculations.monthsUntilFallsOff;
    updateData.recommendation = calculations.recommendation;
    updateData.recommendationReason = calculations.recommendationReason;
  }

  const item = await prisma.negativeItem.update({
    where: { id: itemId },
    data: updateData,
    include: {
      furnisher: true,
      _count: {
        select: { disputes: true },
      },
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'ITEM_UPDATED',
      description: `Updated negative item: ${item.creditorName}`,
      entityType: 'negative_item',
      entityId: item.id,
    },
  });

  return {
    ...item,
    disputeCount: item._count.disputes,
    _count: undefined,
  };
}

/**
 * Delete a negative item
 */
async function deleteItem(itemId, userId) {
  const item = await prisma.negativeItem.findFirst({
    where: { id: itemId, userId },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  // Delete related disputes first
  await prisma.dispute.deleteMany({
    where: { negativeItemId: itemId },
  });

  // Delete the item
  await prisma.negativeItem.delete({
    where: { id: itemId },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'ITEM_DELETED',
      description: `Deleted negative item: ${item.creditorName}`,
      entityType: 'negative_item',
      entityId: itemId,
    },
  });

  return true;
}

// ===========================================
// ANALYSIS & CALCULATIONS
// ===========================================

/**
 * Calculate item metrics (fall-off date, recommendation)
 */
function calculateItemMetrics(data) {
  const { dateOfFirstDelinquency, lastActivityDate, accountType } = data;
  const now = new Date();

  let fallsOffDate = null;
  let monthsUntilFallsOff = null;
  let recommendation = 'DISPUTE_NOW';
  let recommendationReason = '';

  // Calculate 7-year fall-off date from DOFD
  if (dateOfFirstDelinquency) {
    const dofd = new Date(dateOfFirstDelinquency);
    fallsOffDate = new Date(dofd);
    fallsOffDate.setFullYear(fallsOffDate.getFullYear() + 7);

    // Calculate months until falls off
    const diffMs = fallsOffDate - now;
    monthsUntilFallsOff = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30));

    // Determine recommendation based on time remaining
    if (monthsUntilFallsOff <= 0) {
      recommendation = 'DISPUTE_NOW';
      recommendationReason = 'This item should have already fallen off your report. Dispute immediately.';
    } else if (monthsUntilFallsOff <= 6) {
      recommendation = 'WAIT';
      recommendationReason = `Only ${monthsUntilFallsOff} months until this falls off naturally. Disputing may reset the clock.`;
    } else if (monthsUntilFallsOff <= 12) {
      recommendation = 'OPTIONAL';
      recommendationReason = `${monthsUntilFallsOff} months until fall-off. You can dispute, but it may fall off soon.`;
    } else {
      recommendation = 'DISPUTE_NOW';
      recommendationReason = `${monthsUntilFallsOff} months until fall-off. Recommend disputing to try for early removal.`;
    }
  } else {
    recommendationReason = 'No date of first delinquency available. Recommend disputing to request verification.';
  }

  // Special cases by account type
  if (accountType === 'INQUIRY') {
    // Inquiries fall off after 2 years
    recommendation = 'OPTIONAL';
    recommendationReason = 'Hard inquiries fall off after 2 years. Disputing rarely succeeds.';
  }

  if (accountType === 'BANKRUPTCY') {
    // Bankruptcies stay 7-10 years
    recommendation = 'DO_NOT_DISPUTE';
    recommendationReason = 'Bankruptcies are public record and difficult to remove. Focus on rebuilding credit.';
  }

  return {
    fallsOffDate,
    monthsUntilFallsOff,
    recommendation,
    recommendationReason,
  };
}

/**
 * Analyze an item and provide detailed recommendations
 */
async function analyzeItem(itemId, userId, userState = null) {
  const item = await getItemById(itemId, userId);

  if (!item) {
    throw new Error('Item not found');
  }

  // Get state SOL if user state provided
  let solInfo = null;
  if (userState) {
    const stateLaw = await prisma.stateLaw.findUnique({
      where: { stateCode: userState.toUpperCase() },
    });

    if (stateLaw && item.lastActivityDate) {
      const lastActivity = new Date(item.lastActivityDate);
      const solYears = getSolYears(item.accountType, stateLaw);
      const solExpires = new Date(lastActivity);
      solExpires.setFullYear(solExpires.getFullYear() + solYears);

      solInfo = {
        state: userState.toUpperCase(),
        solYears,
        lastActivityDate: item.lastActivityDate,
        solExpiresDate: solExpires,
        solExpired: solExpires < new Date(),
        daysUntilSolExpires: Math.ceil((solExpires - new Date()) / (1000 * 60 * 60 * 24)),
      };
    }
  }

  // Calculate bureaus reporting
  const bureausReporting = [];
  if (item.onEquifax) bureausReporting.push('EQUIFAX');
  if (item.onExperian) bureausReporting.push('EXPERIAN');
  if (item.onTransunion) bureausReporting.push('TRANSUNION');

  // Get dispute history analysis
  const disputeAnalysis = analyzeDisputeHistory(item.disputes);

  // Generate strategy recommendations
  const strategies = generateStrategies(item, solInfo, disputeAnalysis);

  return {
    item: {
      id: item.id,
      creditorName: item.creditorName,
      accountType: item.accountType,
      balance: item.balance,
      status: item.status,
    },
    metrics: {
      fallsOffDate: item.fallsOffDate,
      monthsUntilFallsOff: item.monthsUntilFallsOff,
      recommendation: item.recommendation,
      recommendationReason: item.recommendationReason,
    },
    bureaus: {
      reporting: bureausReporting,
      count: bureausReporting.length,
    },
    statuteOfLimitations: solInfo,
    disputeHistory: disputeAnalysis,
    strategies,
  };
}

/**
 * Get SOL years based on account type
 */
function getSolYears(accountType, stateLaw) {
  switch (accountType) {
    case 'CREDIT_CARD':
    case 'COLLECTION':
    case 'CHARGE_OFF':
      return stateLaw.solOpenAccount;
    case 'AUTO_LOAN':
    case 'PERSONAL_LOAN':
    case 'MORTGAGE':
      return stateLaw.solWrittenContract;
    case 'MEDICAL':
      return stateLaw.solOpenAccount;
    default:
      return stateLaw.solWrittenContract;
  }
}

/**
 * Analyze dispute history
 */
function analyzeDisputeHistory(disputes) {
  if (!disputes || disputes.length === 0) {
    return {
      totalDisputes: 0,
      currentRound: 1,
      lastDisputeDate: null,
      responses: [],
      nextAction: 'Start initial dispute',
    };
  }

  const sortedDisputes = [...disputes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const lastDispute = sortedDisputes[0];
  const highestRound = Math.max(...disputes.map(d => d.round || 1));

  const responses = disputes
    .filter(d => d.responseType)
    .map(d => ({
      round: d.round,
      response: d.responseType,
      date: d.responseDate,
    }));

  let nextAction = 'Continue monitoring';
  let nextRound = highestRound;

  if (lastDispute.status === 'COMPLETED' || lastDispute.status === 'RESPONSE_RECEIVED') {
    if (lastDispute.responseType === 'VERIFIED') {
      nextRound = Math.min(highestRound + 1, 4);
      nextAction = nextRound <= 4 
        ? `Escalate to Round ${nextRound}` 
        : 'Consider regulatory complaints or legal action';
    } else if (lastDispute.responseType === 'DELETED') {
      nextAction = 'Item deleted! Verify removal on all bureaus.';
    } else if (lastDispute.responseType === 'NO_RESPONSE') {
      nextAction = 'No response received. File complaint with CFPB.';
    }
  } else if (lastDispute.status === 'MAILED') {
    const daysSinceMailed = lastDispute.mailedAt 
      ? Math.ceil((new Date() - new Date(lastDispute.mailedAt)) / (1000 * 60 * 60 * 24))
      : 0;
    nextAction = daysSinceMailed > 30 
      ? 'Response overdue. Log response or escalate.'
      : `Waiting for response (${30 - daysSinceMailed} days remaining)`;
  }

  return {
    totalDisputes: disputes.length,
    currentRound: highestRound,
    lastDisputeDate: lastDispute.createdAt,
    lastDisputeStatus: lastDispute.status,
    responses,
    nextAction,
    nextRound,
  };
}

/**
 * Generate strategy recommendations
 */
function generateStrategies(item, solInfo, disputeAnalysis) {
  const strategies = [];

  // Primary strategy based on account type and round
  if (item.accountType === 'COLLECTION' || item.accountType === 'MEDICAL') {
    strategies.push({
      type: 'DEBT_VALIDATION',
      target: 'FURNISHER',
      priority: 'HIGH',
      description: 'Send debt validation letter to the collection agency',
      reason: 'Collections must be validated under FDCPA. Many cannot prove ownership.',
    });
  }

  // Bureau dispute
  const bureaus = [];
  if (item.onEquifax) bureaus.push('EQUIFAX');
  if (item.onExperian) bureaus.push('EXPERIAN');
  if (item.onTransunion) bureaus.push('TRANSUNION');

  if (bureaus.length > 0) {
    const round = disputeAnalysis.nextRound || 1;
    const strategyTypes = {
      1: 'INITIAL_DISPUTE',
      2: 'METHOD_OF_VERIFICATION',
      3: 'PROCEDURAL_VIOLATION',
      4: 'LEGAL_ESCALATION',
    };

    strategies.push({
      type: strategyTypes[round] || 'INITIAL_DISPUTE',
      target: 'BUREAU',
      bureaus,
      priority: 'HIGH',
      round,
      description: `Send Round ${round} dispute to ${bureaus.join(', ')}`,
      reason: `This is the recommended next step based on your dispute history.`,
    });
  }

  // SOL-based strategy
  if (solInfo && solInfo.solExpired) {
    strategies.push({
      type: 'SOL_EXPIRED',
      priority: 'MEDIUM',
      description: 'Statute of limitations has expired',
      reason: 'The collector cannot sue you for this debt. You can mention this in disputes.',
    });
  }

  // Goodwill option for late payments
  if (item.accountType === 'LATE_PAYMENT') {
    strategies.push({
      type: 'GOODWILL',
      target: 'FURNISHER',
      priority: 'MEDIUM',
      description: 'Send goodwill letter to original creditor',
      reason: 'If you have otherwise good history, creditors may remove as a courtesy.',
    });
  }

  return strategies;
}

/**
 * Calculate user stats
 */
async function calculateUserStats(userId) {
  const [
    totalItems, 
    activeItems, 
    disputingItems, 
    deletedItems, 
    totalBalance,
    byBureau,
    byType,
    recentWins
  ] = await Promise.all([
    prisma.negativeItem.count({ where: { userId } }),
    prisma.negativeItem.count({ where: { userId, status: 'ACTIVE' } }),
    prisma.negativeItem.count({ where: { userId, status: 'DISPUTING' } }),
    prisma.negativeItem.count({ where: { userId, status: 'DELETED' } }),
    prisma.negativeItem.aggregate({
      where: { userId, status: { in: ['ACTIVE', 'DISPUTING'] } },
      _sum: { balance: true },
    }),
    // Count by bureau
    Promise.all([
      prisma.negativeItem.count({ where: { userId, onEquifax: true, status: { not: 'DELETED' } } }),
      prisma.negativeItem.count({ where: { userId, onExperian: true, status: { not: 'DELETED' } } }),
      prisma.negativeItem.count({ where: { userId, onTransunion: true, status: { not: 'DELETED' } } }),
    ]),
    // Group by type
    prisma.negativeItem.groupBy({
      by: ['accountType'],
      where: { userId, status: { not: 'DELETED' } },
      _count: { id: true },
      _sum: { balance: true },
    }),
    // Recent wins (last 30 days)
    prisma.win.count({
      where: {
        userId,
        achievedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  // Calculate debt eliminated
  const debtEliminated = await prisma.win.aggregate({
    where: { userId },
    _sum: { debtEliminated: true },
  });

  return {
    totalItems,
    activeItems,
    disputingItems,
    deletedItems,
    totalBalance: totalBalance._sum.balance || 0,
    debtEliminated: debtEliminated._sum.debtEliminated || 0,
    deletionRate: totalItems > 0 ? Math.round((deletedItems / totalItems) * 100) : 0,
    byBureau: {
      equifax: byBureau[0],
      experian: byBureau[1],
      transunion: byBureau[2],
    },
    byType: byType.map(t => ({
      type: t.accountType,
      count: t._count.id,
      balance: t._sum.balance || 0,
    })),
    recentWins,
  };
}

/**
 * Bulk update items (e.g., mark as deleted)
 */
async function bulkUpdateItems(itemIds, userId, updates) {
  // Verify ownership
  const items = await prisma.negativeItem.findMany({
    where: {
      id: { in: itemIds },
      userId,
    },
  });

  if (items.length !== itemIds.length) {
    throw new Error('Some items not found or unauthorized');
  }

  await prisma.negativeItem.updateMany({
    where: {
      id: { in: itemIds },
      userId,
    },
    data: updates,
  });

  return { updated: items.length };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Mask account number (show last 4 digits)
 */
function maskAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  const cleaned = accountNumber.replace(/\D/g, '');
  if (cleaned.length <= 4) return 'XXXX' + cleaned;
  return 'XXXX' + cleaned.slice(-4);
}

/**
 * Get account type display name
 */
function getAccountTypeDisplayName(type) {
  const names = {
    COLLECTION: 'Collection',
    LATE_PAYMENT: 'Late Payment',
    CHARGE_OFF: 'Charge-Off',
    REPOSSESSION: 'Repossession',
    FORECLOSURE: 'Foreclosure',
    BANKRUPTCY: 'Bankruptcy',
    JUDGMENT: 'Judgment',
    TAX_LIEN: 'Tax Lien',
    INQUIRY: 'Hard Inquiry',
    MEDICAL: 'Medical Collection',
    STUDENT_LOAN: 'Student Loan',
    CREDIT_CARD: 'Credit Card',
    AUTO_LOAN: 'Auto Loan',
    MORTGAGE: 'Mortgage',
    PERSONAL_LOAN: 'Personal Loan',
    OTHER: 'Other',
  };
  return names[type] || type;
}

module.exports = {
  createItem,
  getUserItems,
  getItemById,
  updateItem,
  deleteItem,
  analyzeItem,
  calculateItemMetrics,
  calculateUserStats,
  bulkUpdateItems,
  maskAccountNumber,
  getAccountTypeDisplayName,
};
