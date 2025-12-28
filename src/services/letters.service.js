// ===========================================
// CREDITHOPPER - LETTERS SERVICE
// ===========================================

const prisma = require('../config/database');
const claudeService = require('./claude.service');

/**
 * Generate a dispute letter
 */
async function generateLetter(params) {
  const {
    userId,
    negativeItemId,
    disputeId,
    letterType,
    target,
    bureau,
    customNotes,
    includeUserInfo = false,  // Whether to include user header
    includeRecipient = false, // Whether to include recipient address
  } = params;

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      ssnLast4: true,
      dateOfBirth: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get negative item
  const negativeItem = await prisma.negativeItem.findUnique({
    where: { id: negativeItemId },
    include: {
      furnisher: true,
    },
  });

  if (!negativeItem) {
    throw new Error('Negative item not found');
  }

  // Get previous disputes for this item (for context in follow-ups)
  const previousDisputes = await prisma.dispute.findMany({
    where: {
      negativeItemId,
      status: { in: ['COMPLETED', 'RESPONSE_RECEIVED', 'MAILED'] },
    },
    select: {
      round: true,
      mailedAt: true,
      responseType: true,
      strategy: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Generate letter using Claude
  const result = await claudeService.generateDisputeLetter({
    letterType,
    target,
    bureau,
    negativeItem: {
      ...negativeItem,
    },
    user,
    previousDisputes,
    customNotes,
  });

  // Format complete letter if requested
  let completeLetter = result.letter;
  
  if (includeUserInfo || includeRecipient) {
    // Get recipient address
    let recipient = null;
    if (target === 'FURNISHER' && negativeItem.furnisher) {
      recipient = {
        name: negativeItem.furnisher.name,
        street: negativeItem.furnisher.street,
        city: negativeItem.furnisher.city,
        state: negativeItem.furnisher.state,
        zip: negativeItem.furnisher.zipCode,
      };
    }

    completeLetter = claudeService.formatCompleteLetter({
      letterBody: result.letter,
      user: {
        ...user,
        fullName: `${user.firstName} ${user.lastName}`,
      },
      recipient: includeRecipient ? recipient : null,
      bureau: includeRecipient ? bureau : null,
      includeDate: true,
    });
  }

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'LETTER_GENERATED',
      description: `Generated ${letterType.replace(/_/g, ' ').toLowerCase()} letter for ${negativeItem.creditorName}`,
      entityType: 'negative_item',
      entityId: negativeItemId,
      metadata: {
        letterType,
        target,
        bureau,
        tokens: result.usage,
      },
    },
  });

  return {
    success: true,
    letter: result.letter,           // Just the body
    completeLetter,                   // Full formatted letter
    letterType,
    target,
    bureau,
    metadata: result.metadata,
    usage: result.usage,
    // Include data for frontend to build preview
    userData: {
      fullName: `${user.firstName} ${user.lastName}`,
      street: user.street,
      city: user.city,
      state: user.state,
      zipCode: user.zipCode,
      ssnLast4: user.ssnLast4,
      dateOfBirth: user.dateOfBirth,
    },
    recipientData: target === 'BUREAU' 
      ? claudeService.getBureauAddress(bureau)
      : negativeItem.furnisher 
        ? {
            name: negativeItem.furnisher.name,
            street: negativeItem.furnisher.street,
            city: negativeItem.furnisher.city,
            state: negativeItem.furnisher.state,
            zip: negativeItem.furnisher.zipCode,
          }
        : null,
    itemData: {
      creditorName: negativeItem.creditorName,
      accountNumberMasked: negativeItem.accountNumberMasked,
      balance: negativeItem.balance,
    },
  };
}

/**
 * Regenerate a letter with different variation
 */
async function regenerateLetter(params) {
  // Same as generate but Claude will produce different variation
  return generateLetter(params);
}

/**
 * Get available letter types with descriptions
 * Updated to reflect human-language approach
 */
function getLetterTypes() {
  return [
    {
      type: 'INITIAL_DISPUTE',
      name: 'Initial Dispute',
      description: "First contact - simply say you don't recognize the account",
      target: 'BUREAU',
      whenToUse: 'First time disputing an item',
    },
    {
      type: 'DEBT_VALIDATION',
      name: 'Debt Validation',
      description: 'Ask the collector to prove they own the debt',
      target: 'FURNISHER',
      whenToUse: 'When contacted by a collection agency',
    },
    {
      type: 'METHOD_OF_VERIFICATION',
      name: 'Method of Verification',
      description: 'Ask how they verified after they claim it\'s valid',
      target: 'BUREAU',
      whenToUse: 'After bureau says "verified" without proof',
    },
    {
      type: 'FOLLOW_UP',
      name: 'Follow-up Dispute',
      description: 'Continue disputing after no satisfactory response',
      target: 'BUREAU',
      whenToUse: 'When previous dispute didn\'t resolve the issue',
    },
    {
      type: 'GOODWILL',
      name: 'Goodwill Request',
      description: 'Politely ask creditor to remove as a courtesy',
      target: 'FURNISHER',
      whenToUse: 'For legitimate late payments you want removed',
    },
    {
      type: 'EARLY_EXCLUSION',
      name: 'Medical Debt Exclusion',
      description: 'Request removal of medical debt under new rules',
      target: 'BUREAU',
      whenToUse: 'For medical debts that may qualify for exclusion',
    },
  ];
}

/**
 * Get letter type recommendations based on item and situation
 */
function getRecommendedLetterType(negativeItem, disputeCount = 0, target = 'BUREAU') {
  // For furnishers (collections)
  if (target === 'FURNISHER') {
    if (negativeItem.accountType === 'COLLECTION' || negativeItem.accountType === 'MEDICAL') {
      return {
        type: 'DEBT_VALIDATION',
        reason: 'Collections should be validated - many collectors can\'t prove ownership',
      };
    }
    if (negativeItem.accountType === 'LATE_PAYMENT' || negativeItem.accountType === 'CREDIT_CARD') {
      return {
        type: 'GOODWILL',
        reason: 'Original creditors sometimes remove marks as a courtesy',
      };
    }
  }

  // For bureaus based on dispute history
  if (disputeCount === 0) {
    return {
      type: 'INITIAL_DISPUTE',
      reason: 'Start with a simple dispute - no need to be aggressive yet',
    };
  }
  
  if (disputeCount === 1) {
    return {
      type: 'METHOD_OF_VERIFICATION',
      reason: 'They verified without showing proof - ask them how',
    };
  }
  
  if (disputeCount >= 2) {
    return {
      type: 'FOLLOW_UP',
      reason: 'Keep the pressure on - persistence often works',
    };
  }

  return {
    type: 'INITIAL_DISPUTE',
    reason: 'Start with the basics',
  };
}

/**
 * Get available letter templates (static templates for bundle downloads)
 */
async function getTemplates(options = {}) {
  const { category, targetType, accountType, round, isPremium } = options;

  const where = {
    isActive: true,
    ...(category && { category }),
    ...(targetType && { targetType }),
    ...(round && { round }),
    ...(isPremium !== undefined && { isPremium }),
  };

  if (accountType) {
    where.accountTypes = {
      has: accountType,
    };
  }

  const templates = await prisma.letterTemplate.findMany({
    where,
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      targetType: true,
      accountTypes: true,
      round: true,
      variables: true,
      isPremium: true,
      successRate: true,
    },
    orderBy: [
      { category: 'asc' },
      { round: 'asc' },
      { name: 'asc' },
    ],
  });

  return templates;
}

/**
 * Get a specific template
 */
async function getTemplate(templateId) {
  const template = await prisma.letterTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  await prisma.letterTemplate.update({
    where: { id: templateId },
    data: { useCount: { increment: 1 } },
  });

  return template;
}

/**
 * Fill a template with user data (for static templates)
 */
async function fillTemplate(templateId, userId, negativeItemId, customData = {}) {
  const template = await getTemplate(templateId);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      ssnLast4: true,
      phone: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const negativeItem = await prisma.negativeItem.findUnique({
    where: { id: negativeItemId },
    include: {
      furnisher: true,
    },
  });

  if (!negativeItem) {
    throw new Error('Negative item not found');
  }

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const variables = {
    current_date: today,
    user_name: `${user.firstName} ${user.lastName}`,
    user_address: `${user.street || ''}\n${user.city || ''}, ${user.state || ''} ${user.zipCode || ''}`,
    user_phone: user.phone || '',
    ssn_last4: user.ssnLast4 || 'XXXX',
    
    creditor_name: negativeItem.creditorName,
    original_creditor: negativeItem.originalCreditor || negativeItem.creditorName,
    account_number: negativeItem.accountNumber || negativeItem.accountNumberMasked || 'Unknown',
    balance: negativeItem.balance ? `$${parseFloat(negativeItem.balance).toLocaleString()}` : 'Unknown',
    
    furnisher_name: negativeItem.furnisher?.name || negativeItem.creditorName,
    
    bureau_name: '',
    bureau_address: '',
    
    ...customData,
  };

  if (customData.bureau) {
    const bureauAddr = claudeService.getBureauAddress(customData.bureau);
    if (bureauAddr) {
      variables.bureau_name = bureauAddr.name;
      variables.bureau_address = `${bureauAddr.street}\n${bureauAddr.city}, ${bureauAddr.state} ${bureauAddr.zip}`;
    }
  }

  let content = template.content;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value || '');
  }

  return {
    content,
    template: {
      id: template.id,
      name: template.name,
      category: template.category,
    },
    variables: Object.keys(variables),
  };
}

module.exports = {
  generateLetter,
  regenerateLetter,
  getLetterTypes,
  getRecommendedLetterType,
  getTemplates,
  getTemplate,
  fillTemplate,
};
