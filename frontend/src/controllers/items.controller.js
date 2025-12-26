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

module.exports = {
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem,
  analyzeItem,
  markDeleted,
  bulkUpdate,
  getStats,
  getAccountTypes,
};
