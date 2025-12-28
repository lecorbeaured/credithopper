// ===========================================
// CREDITHOPPER - NEGATIVE ITEMS CONTROLLER
// ===========================================

const itemsService = require('../services/items.service');
const { success, created, error, notFound } = require('../utils/response');

/**
 * POST /api/items
 * Create a new negative item
 */
async function createItem(req, res, next) {
  try {
    const {
      creditReportId,
      creditorName,
      originalCreditor,
      accountNumber,
      accountType,
      balance,
      originalBalance,
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
    } = req.body;

    // Validate required fields
    if (!creditorName) {
      return error(res, 'creditorName is required', 400);
    }

    if (!accountType) {
      return error(res, 'accountType is required', 400);
    }

    // Validate account type
    const validAccountTypes = [
      'COLLECTION', 'LATE_PAYMENT', 'CHARGE_OFF', 'REPOSSESSION',
      'FORECLOSURE', 'BANKRUPTCY', 'JUDGMENT', 'TAX_LIEN', 'INQUIRY',
      'MEDICAL', 'STUDENT_LOAN', 'CREDIT_CARD', 'AUTO_LOAN',
      'MORTGAGE', 'PERSONAL_LOAN', 'OTHER',
    ];

    if (!validAccountTypes.includes(accountType)) {
      return error(res, `accountType must be one of: ${validAccountTypes.join(', ')}`, 400);
    }

    // At least one bureau must be selected
    if (!onEquifax && !onExperian && !onTransunion) {
      return error(res, 'At least one bureau must be selected', 400);
    }

    const item = await itemsService.createItem(req.userId, {
      creditReportId,
      creditorName,
      originalCreditor,
      accountNumber,
      accountType,
      balance,
      originalBalance,
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
    });

    return created(res, { item }, 'Negative item created successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/items
 * List all negative items for current user
 */
async function listItems(req, res, next) {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      accountType,
      bureau,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
    } = req.query;

    const result = await itemsService.getUserItems(req.userId, {
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
      status,
      accountType,
      bureau,
      sortBy,
      sortOrder,
      search,
    });

    return success(res, result, 'Items retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/items/:id
 * Get a single negative item with full details
 */
async function getItem(req, res, next) {
  try {
    const { id } = req.params;

    const item = await itemsService.getItemById(id, req.userId);

    if (!item) {
      return notFound(res, 'Item not found');
    }

    return success(res, { item }, 'Item retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/items/:id
 * Update a negative item
 */
async function updateItem(req, res, next) {
  try {
    const { id } = req.params;

    const item = await itemsService.updateItem(id, req.userId, req.body);

    return success(res, { item }, 'Item updated successfully');

  } catch (err) {
    if (err.message === 'Item not found') {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * DELETE /api/items/:id
 * Delete a negative item
 */
async function deleteItem(req, res, next) {
  try {
    const { id } = req.params;

    await itemsService.deleteItem(id, req.userId);

    return success(res, null, 'Item deleted successfully');

  } catch (err) {
    if (err.message === 'Item not found') {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/items/:id/analyze
 * Get detailed analysis and recommendations for an item
 */
async function analyzeItem(req, res, next) {
  try {
    const { id } = req.params;
    const { state } = req.query;

    // Get user's state from profile if not provided
    let userState = state;
    if (!userState && req.user.state) {
      userState = req.user.state;
    }

    const analysis = await itemsService.analyzeItem(id, req.userId, userState);

    return success(res, { analysis }, 'Analysis retrieved successfully');

  } catch (err) {
    if (err.message === 'Item not found') {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * POST /api/items/:id/mark-deleted
 * Mark an item as deleted from credit report
 */
async function markDeleted(req, res, next) {
  try {
    const { id } = req.params;
    const { bureaus, debtEliminated } = req.body;

    // Update item status
    const item = await itemsService.updateItem(id, req.userId, {
      status: 'DELETED',
      deletedFromBureaus: bureaus || [],
    });

    // Create win record
    const prisma = require('../config/database');
    await prisma.win.create({
      data: {
        userId: req.userId,
        negativeItemId: id,
        winType: 'FULL_DELETION',
        bureausAffected: bureaus || [],
        debtEliminated: debtEliminated ? parseFloat(debtEliminated) : item.balance,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.userId,
        action: 'WIN_RECORDED',
        description: `Item deleted: ${item.creditorName}`,
        entityType: 'negative_item',
        entityId: id,
      },
    });

    return success(res, { item }, 'Item marked as deleted');

  } catch (err) {
    if (err.message === 'Item not found') {
      return notFound(res, err.message);
    }
    next(err);
  }
}

/**
 * POST /api/items/bulk-update
 * Update multiple items at once
 */
async function bulkUpdate(req, res, next) {
  try {
    const { itemIds, updates } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return error(res, 'itemIds array is required', 400);
    }

    if (!updates || Object.keys(updates).length === 0) {
      return error(res, 'updates object is required', 400);
    }

    // Only allow certain fields for bulk update
    const allowedBulkFields = ['status', 'onEquifax', 'onExperian', 'onTransunion'];
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
      if (allowedBulkFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return error(res, `Only these fields can be bulk updated: ${allowedBulkFields.join(', ')}`, 400);
    }

    const result = await itemsService.bulkUpdateItems(itemIds, req.userId, filteredUpdates);

    return success(res, result, `${result.updated} items updated`);

  } catch (err) {
    if (err.message.includes('not found')) {
      return error(res, err.message, 400);
    }
    next(err);
  }
}

/**
 * POST /api/items/bulk-delete
 * Delete multiple items at once
 */
async function bulkDelete(req, res, next) {
  try {
    const { itemIds } = req.body;

    if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
      return error(res, 'itemIds array is required', 400);
    }

    if (itemIds.length > 50) {
      return error(res, 'Cannot delete more than 50 items at once', 400);
    }

    const prisma = require('../config/database');
    
    // Verify ownership
    const items = await prisma.negativeItem.findMany({
      where: {
        id: { in: itemIds },
        userId: req.userId,
      },
    });

    if (items.length === 0) {
      return error(res, 'No items found', 404);
    }

    // Delete related disputes first
    await prisma.dispute.deleteMany({
      where: { negativeItemId: { in: itemIds } },
    });

    // Delete items
    const result = await prisma.negativeItem.deleteMany({
      where: {
        id: { in: itemIds },
        userId: req.userId,
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.userId,
        action: 'ITEMS_BULK_DELETED',
        description: `Bulk deleted ${result.count} items`,
        entityType: 'negative_item',
      },
    });

    return success(res, { deleted: result.count }, `${result.count} items deleted`);

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/items/export
 * Export items to CSV
 */
async function exportItems(req, res, next) {
  try {
    const { status, accountType, bureau } = req.query;
    const prisma = require('../config/database');

    // Build where clause
    const where = { userId: req.userId };
    if (status) where.status = status;
    if (accountType) where.accountType = accountType;
    if (bureau === 'EQUIFAX') where.onEquifax = true;
    if (bureau === 'EXPERIAN') where.onExperian = true;
    if (bureau === 'TRANSUNION') where.onTransunion = true;

    const items = await prisma.negativeItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    // Build CSV
    const headers = [
      'Creditor Name',
      'Original Creditor',
      'Account Number',
      'Account Type',
      'Balance',
      'Status',
      'Equifax',
      'Experian',
      'TransUnion',
      'Date of First Delinquency',
      'Falls Off Date',
      'Recommendation',
      'Created At',
    ];

    const rows = items.map(item => [
      item.creditorName || '',
      item.originalCreditor || '',
      item.accountNumberMasked || '',
      item.accountType || '',
      item.balance ? item.balance.toFixed(2) : '',
      item.status || '',
      item.onEquifax ? 'Yes' : 'No',
      item.onExperian ? 'Yes' : 'No',
      item.onTransunion ? 'Yes' : 'No',
      item.dateOfFirstDelinquency ? new Date(item.dateOfFirstDelinquency).toLocaleDateString() : '',
      item.fallsOffDate ? new Date(item.fallsOffDate).toLocaleDateString() : '',
      item.recommendation || '',
      item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '',
    ]);

    // Escape CSV values
    const escapeCSV = (val) => {
      if (typeof val !== 'string') val = String(val);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    };

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map(row => row.map(escapeCSV).join(',')),
    ].join('\n');

    // Set headers for download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="credithopper-items-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/items/stats
 * Get user's item statistics
 */
async function getStats(req, res, next) {
  try {
    const stats = await itemsService.calculateUserStats(req.userId);

    return success(res, { stats }, 'Stats retrieved successfully');

  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/items/types
 * Get list of account types with display names
 */
async function getAccountTypes(req, res, next) {
  try {
    const types = [
      { value: 'COLLECTION', label: 'Collection', description: 'Debt sent to collections agency' },
      { value: 'LATE_PAYMENT', label: 'Late Payment', description: '30+ days past due payment' },
      { value: 'CHARGE_OFF', label: 'Charge-Off', description: 'Creditor wrote off as loss' },
      { value: 'REPOSSESSION', label: 'Repossession', description: 'Vehicle or property repossessed' },
      { value: 'FORECLOSURE', label: 'Foreclosure', description: 'Home foreclosure' },
      { value: 'BANKRUPTCY', label: 'Bankruptcy', description: 'Chapter 7 or 13 bankruptcy' },
      { value: 'JUDGMENT', label: 'Judgment', description: 'Court judgment against you' },
      { value: 'TAX_LIEN', label: 'Tax Lien', description: 'IRS or state tax lien' },
      { value: 'INQUIRY', label: 'Hard Inquiry', description: 'Credit check from application' },
      { value: 'MEDICAL', label: 'Medical Collection', description: 'Medical debt in collections' },
      { value: 'STUDENT_LOAN', label: 'Student Loan', description: 'Delinquent student loan' },
      { value: 'CREDIT_CARD', label: 'Credit Card', description: 'Credit card account issue' },
      { value: 'AUTO_LOAN', label: 'Auto Loan', description: 'Auto loan account issue' },
      { value: 'MORTGAGE', label: 'Mortgage', description: 'Mortgage account issue' },
      { value: 'PERSONAL_LOAN', label: 'Personal Loan', description: 'Personal loan account issue' },
      { value: 'OTHER', label: 'Other', description: 'Other negative item' },
    ];

    return success(res, { types }, 'Account types retrieved');

  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/items/analyze-all
 * Get AI analysis and prioritized recommendations for all active items
 */
async function analyzeAllItems(req, res, next) {
  try {
    const { state } = req.body;
    const prisma = require('../config/database');

    // Get user's state from profile if not provided
    let userState = state;
    if (!userState) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { state: true },
      });
      userState = user?.state;
    }

    // Get all active items
    const items = await prisma.negativeItem.findMany({
      where: {
        userId: req.userId,
        status: { in: ['ACTIVE', 'DISPUTING'] },
      },
      include: {
        disputes: {
          select: {
            id: true,
            round: true,
            status: true,
            responseType: true,
            mailedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { balance: 'desc' },
    });

    if (items.length === 0) {
      return success(res, {
        summary: {
          totalItems: 0,
          totalDebt: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
        },
        items: [],
        actionPlan: [],
      }, 'No active items to analyze');
    }

    // Analyze each item
    const analyzedItems = [];
    let highPriority = 0;
    let mediumPriority = 0;
    let lowPriority = 0;

    for (const item of items) {
      const analysis = await itemsService.analyzeItem(item.id, req.userId, userState);
      
      // Determine priority
      let priority = 'LOW';
      if (analysis.metrics.recommendation === 'DISPUTE_NOW') {
        priority = 'HIGH';
        highPriority++;
      } else if (analysis.metrics.recommendation === 'OPTIONAL') {
        priority = 'MEDIUM';
        mediumPriority++;
      } else {
        lowPriority++;
      }

      analyzedItems.push({
        id: item.id,
        creditorName: item.creditorName,
        accountType: item.accountType,
        balance: item.balance,
        priority,
        recommendation: analysis.metrics.recommendation,
        reason: analysis.metrics.recommendationReason,
        fallsOffDate: analysis.metrics.fallsOffDate,
        monthsUntilFallsOff: analysis.metrics.monthsUntilFallsOff,
        currentRound: analysis.disputeHistory.currentRound,
        nextAction: analysis.disputeHistory.nextAction,
        suggestedStrategy: analysis.strategies[0] || null,
        bureausReporting: analysis.bureaus.reporting,
        statuteOfLimitations: analysis.statuteOfLimitations,
      });
    }

    // Sort by priority (HIGH first, then by balance)
    analyzedItems.sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (b.balance || 0) - (a.balance || 0);
    });

    // Generate action plan (top 5 items to tackle)
    const actionPlan = analyzedItems
      .filter(i => i.priority === 'HIGH' || i.priority === 'MEDIUM')
      .slice(0, 5)
      .map((item, index) => ({
        step: index + 1,
        itemId: item.id,
        creditor: item.creditorName,
        action: item.nextAction,
        strategy: item.suggestedStrategy?.type || 'INITIAL_DISPUTE',
        reason: item.reason,
      }));

    const totalDebt = items.reduce((sum, i) => sum + (i.balance || 0), 0);

    return success(res, {
      summary: {
        totalItems: items.length,
        totalDebt,
        highPriority,
        mediumPriority,
        lowPriority,
        userState: userState || null,
      },
      items: analyzedItems,
      actionPlan,
    }, 'Analysis complete');

  } catch (err) {
    next(err);
  }
}

module.exports = {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
  analyzeItem,
  markDeleted,
  bulkUpdate,
  bulkDelete,
  exportItems,
  getStats,
  getAccountTypes,
  analyzeAllItems,
};
