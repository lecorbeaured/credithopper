// ===========================================
// CREDITHOPPER - DASHBOARD SERVICE
// ===========================================

const prisma = require('../config/database');

// ===========================================
// DASHBOARD OVERVIEW
// ===========================================

/**
 * Get complete dashboard data for a user
 */
async function getDashboardData(userId) {
  const [
    itemsStats,
    disputeStats,
    winsStats,
    recentActivity,
    attentionItems,
    progressMetrics,
    onboardingStatus,
    quickActions,
  ] = await Promise.all([
    getItemsStats(userId),
    getDisputeStats(userId),
    getWinsStats(userId),
    getRecentActivity(userId, 10),
    getAttentionItems(userId),
    getProgressMetrics(userId),
    getOnboardingStatus(userId),
    getQuickActions(userId),
  ]);

  return {
    items: itemsStats,
    disputes: disputeStats,
    wins: winsStats,
    recentActivity,
    attention: attentionItems,
    progress: progressMetrics,
    onboarding: onboardingStatus,
    quickActions,
    lastUpdated: new Date().toISOString(),
  };
}

// ===========================================
// ONBOARDING STATUS
// ===========================================

/**
 * Get onboarding checklist status
 */
async function getOnboardingStatus(userId) {
  const [
    user,
    hasReports,
    hasItems,
    hasDisputes,
    hasMailedDispute,
    hasWin,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        street: true,
        city: true,
        state: true,
        zipCode: true,
        ssnLast4: true,
      },
    }),
    prisma.creditReport.count({ where: { userId } }).then(c => c > 0),
    prisma.negativeItem.count({ where: { userId } }).then(c => c > 0),
    prisma.dispute.count({ where: { userId } }).then(c => c > 0),
    prisma.dispute.count({ where: { userId, status: 'MAILED' } }).then(c => c > 0),
    prisma.win.count({ where: { userId } }).then(c => c > 0),
  ]);

  // Check if profile is complete
  const hasCompleteProfile = !!(
    user?.street && 
    user?.city && 
    user?.state && 
    user?.zipCode && 
    user?.ssnLast4
  );

  const steps = [
    {
      id: 'profile',
      label: 'Complete your profile',
      description: 'Add your address for dispute letters',
      completed: hasCompleteProfile,
      link: '/settings',
    },
    {
      id: 'report',
      label: 'Upload your credit report',
      description: 'Get your free report from annualcreditreport.com',
      completed: hasReports,
      link: '/engine',
    },
    {
      id: 'items',
      label: 'Review negative items',
      description: 'Identify items to dispute',
      completed: hasItems,
      link: '/engine',
    },
    {
      id: 'dispute',
      label: 'Create your first dispute',
      description: 'Generate a letter and start disputing',
      completed: hasDisputes,
      link: '/engine',
    },
    {
      id: 'mail',
      label: 'Mail your first letter',
      description: 'Send via certified mail for tracking',
      completed: hasMailedDispute,
      link: '/my-letters',
    },
    {
      id: 'win',
      label: 'Record your first win',
      description: 'Track deletions and corrections',
      completed: hasWin,
      link: '/dashboard',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const percentComplete = Math.round((completedCount / totalSteps) * 100);

  return {
    steps,
    completedCount,
    totalSteps,
    percentComplete,
    isComplete: completedCount === totalSteps,
    nextStep: steps.find(s => !s.completed) || null,
  };
}

// ===========================================
// QUICK ACTIONS
// ===========================================

/**
 * Get personalized quick actions based on user state
 */
async function getQuickActions(userId) {
  const [
    hasReports,
    itemsToDispute,
    draftDisputes,
    overdueDisputes,
    readyForNextRound,
  ] = await Promise.all([
    prisma.creditReport.count({ where: { userId } }).then(c => c > 0),
    prisma.negativeItem.count({
      where: {
        userId,
        status: 'ACTIVE',
        disputes: { none: {} },
      },
    }),
    prisma.dispute.count({
      where: { userId, status: 'DRAFT' },
    }),
    prisma.dispute.count({
      where: {
        userId,
        status: 'MAILED',
        responseDueDate: { lt: new Date() },
      },
    }),
    prisma.dispute.count({
      where: {
        userId,
        status: 'RESPONSE_RECEIVED',
        responseType: 'VERIFIED',
        round: { lt: 4 },
      },
    }),
  ]);

  const actions = [];

  // Priority 1: Upload first report
  if (!hasReports) {
    actions.push({
      id: 'upload-report',
      label: 'Upload Credit Report',
      description: 'Start by uploading your credit report',
      icon: '📄',
      priority: 1,
      link: '/engine',
      variant: 'primary',
    });
  }

  // Priority 2: Handle overdue disputes
  if (overdueDisputes > 0) {
    actions.push({
      id: 'overdue-disputes',
      label: `${overdueDisputes} Overdue Response${overdueDisputes > 1 ? 's' : ''}`,
      description: 'Log bureau responses to continue',
      icon: '⚠️',
      priority: 2,
      link: '/my-letters',
      variant: 'warning',
      count: overdueDisputes,
    });
  }

  // Priority 3: Send draft letters
  if (draftDisputes > 0) {
    actions.push({
      id: 'send-drafts',
      label: `${draftDisputes} Letter${draftDisputes > 1 ? 's' : ''} Ready to Send`,
      description: 'Print and mail your dispute letters',
      icon: '📬',
      priority: 3,
      link: '/my-letters',
      variant: 'info',
      count: draftDisputes,
    });
  }

  // Priority 4: Escalate verified disputes
  if (readyForNextRound > 0) {
    actions.push({
      id: 'escalate',
      label: `Escalate ${readyForNextRound} Dispute${readyForNextRound > 1 ? 's' : ''}`,
      description: 'Bureau verified - send follow-up letter',
      icon: '📈',
      priority: 4,
      link: '/engine',
      variant: 'secondary',
      count: readyForNextRound,
    });
  }

  // Priority 5: Start new disputes
  if (itemsToDispute > 0) {
    actions.push({
      id: 'new-disputes',
      label: `Dispute ${itemsToDispute} Item${itemsToDispute > 1 ? 's' : ''}`,
      description: 'Generate letters for undisputed items',
      icon: '✍️',
      priority: 5,
      link: '/engine',
      variant: 'default',
      count: itemsToDispute,
    });
  }

  // Always show these utility actions
  actions.push({
    id: 'upload-new-report',
    label: 'Upload New Report',
    description: 'Check for updates after disputes',
    icon: '🔄',
    priority: 10,
    link: '/engine',
    variant: 'outline',
  });

  // Sort by priority
  actions.sort((a, b) => a.priority - b.priority);

  return actions.slice(0, 5); // Return top 5 actions
}

// ===========================================
// ITEMS STATISTICS
// ===========================================

/**
 * Get negative items statistics
 */
async function getItemsStats(userId) {
  const [
    total,
    byStatus,
    byType,
    byBureau,
    totalBalance,
  ] = await Promise.all([
    prisma.negativeItem.count({ where: { userId } }),
    prisma.negativeItem.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    prisma.negativeItem.groupBy({
      by: ['accountType'],
      where: { userId },
      _count: true,
      orderBy: { _count: { accountType: 'desc' } },
      take: 5,
    }),
    getBureauBreakdown(userId),
    prisma.negativeItem.aggregate({
      where: { userId },
      _sum: { balance: true },
    }),
  ]);

  // Convert grouped results to objects
  const statusCounts = {};
  byStatus.forEach(item => {
    statusCounts[item.status] = item._count;
  });

  const typeCounts = {};
  byType.forEach(item => {
    typeCounts[item.accountType] = item._count;
  });

  return {
    total,
    active: statusCounts['ACTIVE'] || 0,
    disputing: statusCounts['DISPUTING'] || 0,
    deleted: statusCounts['DELETED'] || 0,
    resolved: statusCounts['RESOLVED'] || 0,
    byType: typeCounts,
    byBureau,
    totalBalance: totalBalance._sum.balance || 0,
  };
}

/**
 * Get bureau breakdown
 */
async function getBureauBreakdown(userId) {
  const [equifax, experian, transunion] = await Promise.all([
    prisma.negativeItem.count({ where: { userId, onEquifax: true, status: { not: 'DELETED' } } }),
    prisma.negativeItem.count({ where: { userId, onExperian: true, status: { not: 'DELETED' } } }),
    prisma.negativeItem.count({ where: { userId, onTransunion: true, status: { not: 'DELETED' } } }),
  ]);

  return {
    EQUIFAX: equifax,
    EXPERIAN: experian,
    TRANSUNION: transunion,
  };
}

// ===========================================
// DISPUTE STATISTICS
// ===========================================

/**
 * Get dispute statistics
 */
async function getDisputeStats(userId) {
  const [
    total,
    byStatus,
    byRound,
    byTarget,
    avgResponseDays,
  ] = await Promise.all([
    prisma.dispute.count({ where: { userId } }),
    prisma.dispute.groupBy({
      by: ['status'],
      where: { userId },
      _count: true,
    }),
    prisma.dispute.groupBy({
      by: ['round'],
      where: { userId },
      _count: true,
    }),
    prisma.dispute.groupBy({
      by: ['target'],
      where: { userId },
      _count: true,
    }),
    calculateAverageResponseTime(userId),
  ]);

  // Convert grouped results
  const statusCounts = {};
  byStatus.forEach(item => {
    statusCounts[item.status] = item._count;
  });

  const roundCounts = {};
  byRound.forEach(item => {
    roundCounts[`Round ${item.round}`] = item._count;
  });

  const targetCounts = {};
  byTarget.forEach(item => {
    targetCounts[item.target] = item._count;
  });

  // Calculate overdue
  const overdue = await prisma.dispute.count({
    where: {
      userId,
      status: 'MAILED',
      responseDueDate: { lt: new Date() },
    },
  });

  return {
    total,
    drafts: statusCounts['DRAFT'] || 0,
    mailed: statusCounts['MAILED'] || 0,
    responseReceived: statusCounts['RESPONSE_RECEIVED'] || 0,
    completed: statusCounts['COMPLETED'] || 0,
    overdue,
    byRound: roundCounts,
    byTarget: targetCounts,
    averageResponseDays: avgResponseDays,
  };
}

/**
 * Calculate average response time
 */
async function calculateAverageResponseTime(userId) {
  const disputesWithResponse = await prisma.dispute.findMany({
    where: {
      userId,
      mailedAt: { not: null },
      responseDate: { not: null },
    },
    select: {
      mailedAt: true,
      responseDate: true,
    },
  });

  if (disputesWithResponse.length === 0) return null;

  const totalDays = disputesWithResponse.reduce((sum, dispute) => {
    const days = Math.ceil(
      (new Date(dispute.responseDate) - new Date(dispute.mailedAt)) / (1000 * 60 * 60 * 24)
    );
    return sum + days;
  }, 0);

  return Math.round(totalDays / disputesWithResponse.length);
}

// ===========================================
// WINS STATISTICS
// ===========================================

/**
 * Get wins statistics
 */
async function getWinsStats(userId) {
  const [
    totalWins,
    byType,
    byBureau,
    totalDebtEliminated,
    recentWins,
    monthlyWins,
  ] = await Promise.all([
    prisma.win.count({ where: { userId } }),
    prisma.win.groupBy({
      by: ['winType'],
      where: { userId },
      _count: true,
    }),
    getWinsByBureau(userId),
    prisma.win.aggregate({
      where: { userId },
      _sum: { debtEliminated: true },
    }),
    prisma.win.findMany({
      where: { userId },
      orderBy: { achievedAt: 'desc' },
      take: 5,
      include: {
        negativeItem: {
          select: {
            id: true,
            creditorName: true,
            accountType: true,
          },
        },
      },
    }),
    getMonthlyWins(userId),
  ]);

  const typeCounts = {};
  byType.forEach(item => {
    typeCounts[item.winType] = item._count;
  });

  // Calculate success rate
  const totalDisputes = await prisma.dispute.count({
    where: { userId, status: 'COMPLETED' },
  });
  const successRate = totalDisputes > 0 
    ? Math.round((totalWins / totalDisputes) * 100) 
    : 0;

  return {
    total: totalWins,
    fullDeletions: typeCounts['FULL_DELETION'] || 0,
    partialDeletions: typeCounts['PARTIAL_DELETION'] || 0,
    corrections: typeCounts['CORRECTION'] || 0,
    balanceReductions: typeCounts['BALANCE_REDUCTION'] || 0,
    byBureau,
    totalDebtEliminated: totalDebtEliminated._sum.debtEliminated || 0,
    successRate,
    recentWins,
    monthlyWins,
  };
}

/**
 * Get wins by bureau
 */
async function getWinsByBureau(userId) {
  const wins = await prisma.win.findMany({
    where: { userId },
    select: { bureausAffected: true },
  });

  const counts = { EQUIFAX: 0, EXPERIAN: 0, TRANSUNION: 0 };
  
  wins.forEach(win => {
    if (win.bureausAffected) {
      win.bureausAffected.forEach(bureau => {
        if (counts[bureau] !== undefined) {
          counts[bureau]++;
        }
      });
    }
  });

  return counts;
}

/**
 * Get monthly wins for chart
 */
async function getMonthlyWins(userId) {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const wins = await prisma.win.findMany({
    where: {
      userId,
      achievedAt: { gte: sixMonthsAgo },
    },
    select: {
      achievedAt: true,
      debtEliminated: true,
    },
    orderBy: { achievedAt: 'asc' },
  });

  // Group by month
  const monthlyData = {};
  wins.forEach(win => {
    const month = win.achievedAt.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { count: 0, debtEliminated: 0 };
    }
    monthlyData[month].count++;
    monthlyData[month].debtEliminated += parseFloat(win.debtEliminated || 0);
  });

  return monthlyData;
}

// ===========================================
// ATTENTION ITEMS
// ===========================================

/**
 * Get items requiring attention
 */
async function getAttentionItems(userId) {
  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const [
    overdueDisputes,
    upcomingDeadlines,
    readyToAdvance,
    itemsNearFallOff,
    unprocessedReports,
  ] = await Promise.all([
    // Overdue disputes (past response deadline)
    prisma.dispute.findMany({
      where: {
        userId,
        status: 'MAILED',
        responseDueDate: { lt: now },
      },
      include: {
        negativeItem: {
          select: { id: true, creditorName: true },
        },
      },
      orderBy: { responseDueDate: 'asc' },
    }),

    // Upcoming deadlines (within 7 days)
    prisma.dispute.findMany({
      where: {
        userId,
        status: 'MAILED',
        responseDueDate: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        negativeItem: {
          select: { id: true, creditorName: true },
        },
      },
      orderBy: { responseDueDate: 'asc' },
    }),

    // Ready to advance (verified but not escalated)
    prisma.dispute.findMany({
      where: {
        userId,
        status: 'RESPONSE_RECEIVED',
        responseType: 'VERIFIED',
        round: { lt: 4 },
      },
      include: {
        negativeItem: {
          select: { id: true, creditorName: true },
        },
      },
    }),

    // Items near fall-off (within 6 months)
    prisma.negativeItem.findMany({
      where: {
        userId,
        status: { not: 'DELETED' },
        monthsUntilFallsOff: { lte: 6, gt: 0 },
      },
      select: {
        id: true,
        creditorName: true,
        fallsOffDate: true,
        monthsUntilFallsOff: true,
      },
      orderBy: { fallsOffDate: 'asc' },
    }),

    // Unprocessed reports
    prisma.creditReport.findMany({
      where: {
        userId,
        parseStatus: { in: ['PENDING', 'FAILED'] },
      },
      select: {
        id: true,
        fileName: true,
        parseStatus: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    overdueDisputes,
    upcomingDeadlines,
    readyToAdvance,
    itemsNearFallOff,
    unprocessedReports,
    totalCount: 
      overdueDisputes.length + 
      readyToAdvance.length + 
      unprocessedReports.length,
  };
}

// ===========================================
// PROGRESS METRICS
// ===========================================

/**
 * Get progress metrics
 */
async function getProgressMetrics(userId) {
  const [
    totalItems,
    deletedItems,
    originalBalance,
    eliminatedBalance,
    disputeProgress,
  ] = await Promise.all([
    prisma.negativeItem.count({ where: { userId } }),
    prisma.negativeItem.count({ where: { userId, status: 'DELETED' } }),
    prisma.negativeItem.aggregate({
      where: { userId },
      _sum: { balance: true },
    }),
    prisma.win.aggregate({
      where: { userId },
      _sum: { debtEliminated: true },
    }),
    getDisputeProgressByItem(userId),
  ]);

  const deletionRate = totalItems > 0 
    ? Math.round((deletedItems / totalItems) * 100) 
    : 0;

  const original = originalBalance._sum.balance || 0;
  const eliminated = eliminatedBalance._sum.debtEliminated || 0;
  const debtReductionRate = original > 0 
    ? Math.round((eliminated / original) * 100) 
    : 0;

  return {
    itemsDeletionRate: deletionRate,
    itemsDeleted: deletedItems,
    itemsTotal: totalItems,
    debtOriginal: original,
    debtEliminated: eliminated,
    debtRemaining: Math.max(0, original - eliminated),
    debtReductionRate,
    disputeProgress,
  };
}

/**
 * Get dispute progress by item
 */
async function getDisputeProgressByItem(userId) {
  const items = await prisma.negativeItem.findMany({
    where: { 
      userId,
      status: { in: ['ACTIVE', 'DISPUTING'] },
    },
    include: {
      disputes: {
        select: {
          round: true,
          status: true,
        },
        orderBy: { round: 'desc' },
        take: 1,
      },
    },
  });

  // Group by dispute stage
  const stages = {
    notStarted: 0,
    round1: 0,
    round2: 0,
    round3: 0,
    round4: 0,
  };

  items.forEach(item => {
    if (item.disputes.length === 0) {
      stages.notStarted++;
    } else {
      const round = item.disputes[0].round;
      stages[`round${round}`]++;
    }
  });

  return stages;
}

// ===========================================
// RECENT ACTIVITY
// ===========================================

/**
 * Get recent activity feed
 */
async function getRecentActivity(userId, limit = 20) {
  const activities = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      action: true,
      description: true,
      entityType: true,
      entityId: true,
      createdAt: true,
    },
  });

  return activities.map(activity => ({
    ...activity,
    icon: getActivityIcon(activity.action),
    color: getActivityColor(activity.action),
  }));
}

/**
 * Get icon for activity type
 */
function getActivityIcon(action) {
  const icons = {
    REPORT_UPLOADED: '📄',
    REPORT_PARSED: '🔍',
    REPORT_DELETED: '🗑️',
    ITEM_ADDED: '➕',
    ITEM_UPDATED: '✏️',
    ITEM_DELETED: '🗑️',
    DISPUTE_CREATED: '📝',
    DISPUTE_MAILED: '📬',
    DISPUTE_RESPONSE_LOGGED: '📩',
    DISPUTE_DELETED: '🗑️',
    WIN_RECORDED: '🎉',
    LETTER_GENERATED: '📜',
    USER_REGISTERED: '👤',
    USER_UPDATED: '⚙️',
    PASSWORD_CHANGED: '🔒',
  };
  return icons[action] || '📌';
}

/**
 * Get color for activity type
 */
function getActivityColor(action) {
  const colors = {
    WIN_RECORDED: 'success',
    DISPUTE_MAILED: 'primary',
    DISPUTE_RESPONSE_LOGGED: 'info',
    ITEM_DELETED: 'warning',
    REPORT_DELETED: 'warning',
    DISPUTE_DELETED: 'warning',
  };
  return colors[action] || 'default';
}

// ===========================================
// WINS MANAGEMENT
// ===========================================

/**
 * Create a win record
 */
async function createWin(userId, data) {
  const {
    negativeItemId,
    disputeId,
    winType,
    bureausAffected,
    debtEliminated,
    notes,
  } = data;

  const win = await prisma.win.create({
    data: {
      userId,
      negativeItemId,
      disputeId,
      winType,
      bureausAffected: bureausAffected || [],
      debtEliminated: debtEliminated ? parseFloat(debtEliminated) : null,
      notes,
      achievedAt: new Date(),
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

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'WIN_RECORDED',
      description: `${winType.replace('_', ' ')}: ${win.negativeItem?.creditorName || 'Unknown'}`,
      entityType: 'win',
      entityId: win.id,
    },
  });

  return win;
}

/**
 * Get all wins for a user
 */
async function getUserWins(userId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const skip = (page - 1) * limit;

  const [wins, total] = await Promise.all([
    prisma.win.findMany({
      where: { userId },
      include: {
        negativeItem: {
          select: {
            id: true,
            creditorName: true,
            accountType: true,
            balance: true,
          },
        },
        dispute: {
          select: {
            id: true,
            round: true,
            target: true,
            bureau: true,
          },
        },
      },
      orderBy: { achievedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.win.count({ where: { userId } }),
  ]);

  return {
    wins,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get win by ID
 */
async function getWinById(winId, userId) {
  return prisma.win.findFirst({
    where: { id: winId, userId },
    include: {
      negativeItem: true,
      dispute: true,
    },
  });
}

/**
 * Delete a win
 */
async function deleteWin(winId, userId) {
  const win = await prisma.win.findFirst({
    where: { id: winId, userId },
  });

  if (!win) {
    throw new Error('Win not found');
  }

  await prisma.win.delete({
    where: { id: winId },
  });

  return true;
}

module.exports = {
  getDashboardData,
  getItemsStats,
  getDisputeStats,
  getWinsStats,
  getAttentionItems,
  getProgressMetrics,
  getRecentActivity,
  getOnboardingStatus,
  getQuickActions,
  createWin,
  getUserWins,
  getWinById,
  deleteWin,
};
