// ===========================================
// CREDITHOPPER - CREDIT REPORTS SERVICE
// ===========================================

const prisma = require('../config/database');
const config = require('../config');
const { deleteFile, getAbsolutePath } = require('../middleware/upload');

/**
 * Create a new credit report record
 */
async function createReport(userId, fileData, bureau = null) {
  // Calculate expiration date (90 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + config.creditReport.retentionDays);
  
  const report = await prisma.creditReport.create({
    data: {
      userId,
      fileName: fileData.originalname,
      filePath: fileData.path,
      fileSize: fileData.size,
      mimeType: fileData.mimetype,
      bureau: bureau ? bureau.toUpperCase() : null,
      parseStatus: 'PENDING',
      expiresAt,
    },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      bureau: true,
      parseStatus: true,
      createdAt: true,
      expiresAt: true,
    },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'REPORT_UPLOADED',
      description: `Credit report uploaded: ${fileData.originalname}`,
      entityType: 'credit_report',
      entityId: report.id,
    },
  });
  
  return report;
}

/**
 * Get all reports for a user
 */
async function getUserReports(userId, options = {}) {
  const { page = 1, limit = 20, includeExpired = false } = options;
  const skip = (page - 1) * limit;
  
  const where = {
    userId,
    ...(includeExpired ? {} : { expiresAt: { gt: new Date() } }),
  };
  
  const [reports, total] = await Promise.all([
    prisma.creditReport.findMany({
      where,
      select: {
        id: true,
        fileName: true,
        fileSize: true,
        bureau: true,
        reportDate: true,
        parseStatus: true,
        parsedAt: true,
        parseError: true,
        createdAt: true,
        expiresAt: true,
        _count: {
          select: {
            negativeItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.creditReport.count({ where }),
  ]);
  
  return {
    reports: reports.map(r => ({
      ...r,
      itemsCount: r._count.negativeItems,
      _count: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single report by ID
 */
async function getReportById(reportId, userId = null) {
  const where = { id: reportId };
  if (userId) where.userId = userId;
  
  const report = await prisma.creditReport.findFirst({
    where,
    include: {
      negativeItems: {
        select: {
          id: true,
          creditorName: true,
          accountType: true,
          balance: true,
          status: true,
          onEquifax: true,
          onExperian: true,
          onTransunion: true,
          dateOfFirstDelinquency: true,
          fallsOffDate: true,
          recommendation: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  
  if (!report) {
    return null;
  }
  
  return {
    ...report,
    filePath: undefined, // Don't expose file path
  };
}

/**
 * Update report parsing status
 */
async function updateParseStatus(reportId, status, error = null, parsedData = null) {
  const updateData = {
    parseStatus: status,
    ...(error && { parseError: error }),
    ...(parsedData && { 
      parsedData,
      parsedAt: new Date(),
    }),
  };
  
  if (status === 'COMPLETED') {
    updateData.parsedAt = new Date();
  }
  
  return prisma.creditReport.update({
    where: { id: reportId },
    data: updateData,
  });
}

/**
 * Store parsed text from PDF
 */
async function storeRawText(reportId, rawText) {
  return prisma.creditReport.update({
    where: { id: reportId },
    data: { rawText },
  });
}

/**
 * Detect bureau from PDF text
 */
function detectBureau(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('equifax') || lowerText.includes('efx')) {
    return 'EQUIFAX';
  }
  if (lowerText.includes('experian')) {
    return 'EXPERIAN';
  }
  if (lowerText.includes('transunion') || lowerText.includes('trans union')) {
    return 'TRANSUNION';
  }
  
  return null;
}

/**
 * Update report bureau
 */
async function updateBureau(reportId, bureau) {
  return prisma.creditReport.update({
    where: { id: reportId },
    data: { bureau },
  });
}

/**
 * Delete a report and its file
 */
async function deleteReport(reportId, userId) {
  // Get report first
  const report = await prisma.creditReport.findFirst({
    where: { id: reportId, userId },
  });
  
  if (!report) {
    throw new Error('Report not found');
  }
  
  // Delete file from filesystem
  if (report.filePath) {
    await deleteFile(report.filePath);
  }
  
  // Delete negative items associated with this report
  await prisma.negativeItem.deleteMany({
    where: { creditReportId: reportId },
  });
  
  // Delete the report record
  await prisma.creditReport.delete({
    where: { id: reportId },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'REPORT_DELETED',
      description: `Credit report deleted: ${report.fileName}`,
      entityType: 'credit_report',
      entityId: reportId,
    },
  });
  
  return true;
}

/**
 * Check report count for user (subscription limits)
 */
async function checkReportLimit(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });
  
  const limits = {
    FREE: 1,
    STARTER: 3,
    PRO: 10,
    UNLIMITED: 999,
  };
  
  const maxReports = limits[user?.subscriptionTier] || 1;
  
  const currentCount = await prisma.creditReport.count({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
  });
  
  return {
    current: currentCount,
    max: maxReports,
    canUpload: currentCount < maxReports,
    remaining: maxReports - currentCount,
  };
}

/**
 * Get report file path for download
 */
async function getReportFilePath(reportId, userId) {
  const report = await prisma.creditReport.findFirst({
    where: { id: reportId, userId },
    select: { filePath: true, fileName: true },
  });
  
  if (!report) {
    return null;
  }
  
  return {
    path: report.filePath,
    name: report.fileName,
  };
}

/**
 * Cleanup expired reports
 */
async function cleanupExpiredReports() {
  const expiredReports = await prisma.creditReport.findMany({
    where: {
      expiresAt: { lt: new Date() },
    },
    select: {
      id: true,
      userId: true,
      filePath: true,
    },
  });
  
  let deletedCount = 0;
  
  for (const report of expiredReports) {
    try {
      // Delete file
      if (report.filePath) {
        await deleteFile(report.filePath);
      }
      
      // Delete negative items
      await prisma.negativeItem.deleteMany({
        where: { creditReportId: report.id },
      });
      
      // Delete report
      await prisma.creditReport.delete({
        where: { id: report.id },
      });
      
      deletedCount++;
    } catch (error) {
      console.error(`Failed to delete expired report ${report.id}:`, error);
    }
  }
  
  return deletedCount;
}

module.exports = {
  createReport,
  getUserReports,
  getReportById,
  updateParseStatus,
  storeRawText,
  detectBureau,
  updateBureau,
  deleteReport,
  checkReportLimit,
  getReportFilePath,
  cleanupExpiredReports,
};
