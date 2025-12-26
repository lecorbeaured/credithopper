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
    round,
    customInstructions,
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
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get negative item
  const negativeItem = await prisma.negativeItem.findUnique({
    where: { id: negativeItemId },
  });

  if (!negativeItem) {
    throw new Error('Negative item not found');
  }

  // Get previous disputes for this item
  const previousDisputes = await prisma.dispute.findMany({
    where: {
      negativeItemId,
      status: { in: ['COMPLETED', 'RESPONSE_RECEIVED'] },
    },
    select: {
      round: true,
      mailedAt: true,
      responseType: true,
      strategy: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Get furnisher info if targeting furnisher
  let furnisher = null;
  if (target === 'FURNISHER' && negativeItem.furnisherId) {
    furnisher = await prisma.furnisher.findUnique({
      where: { id: negativeItem.furnisherId },
    });
  }

  // Generate letter using Claude
  const result = await claudeService.generateDisputeLetter({
    letterType,
    target,
    bureau,
    round,
    negativeItem: {
      ...negativeItem,
      furnisher,
    },
    user,
    previousDisputes,
    customInstructions,
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      userId,
      action: 'LETTER_GENERATED',
      description: `Generated ${letterType} letter for ${negativeItem.creditorName}`,
      entityType: 'dispute',
      entityId: disputeId,
      metadata: {
        letterType,
        target,
        bureau,
        round,
        tokens: result.usage,
      },
    },
  });

  return result;
}

/**
 * Get available letter templates
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

  // Handle accountType array filtering
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
 * Get a specific template with content
 */
async function getTemplate(templateId) {
  const template = await prisma.letterTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error('Template not found');
  }

  // Increment use count
  await prisma.letterTemplate.update({
    where: { id: templateId },
    data: { useCount: { increment: 1 } },
  });

  return template;
}

/**
 * Fill a template with user data
 */
async function fillTemplate(templateId, userId, negativeItemId, customData = {}) {
  const template = await getTemplate(templateId);
  
  // Get user
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

  // Build variable map
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
    original_balance: negativeItem.originalBalance ? `$${parseFloat(negativeItem.originalBalance).toLocaleString()}` : '',
    account_type: negativeItem.accountType,
    account_status: negativeItem.accountStatus || '',
    
    date_opened: negativeItem.dateOpened 
      ? new Date(negativeItem.dateOpened).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : '',
    
    // Furnisher info
    furnisher_name: negativeItem.furnisher?.name || negativeItem.creditorName,
    furnisher_address: negativeItem.furnisher 
      ? `${negativeItem.furnisher.street || ''}\n${negativeItem.furnisher.city || ''}, ${negativeItem.furnisher.state || ''} ${negativeItem.furnisher.zipCode || ''}`
      : '',
    
    // Bureau addresses
    bureau_name: '',
    bureau_address: '',
    
    // Custom data overrides
    ...customData,
  };

  // Fill in bureau info if specified
  if (customData.bureau) {
    const bureauAddresses = {
      EQUIFAX: {
        name: 'Equifax Information Services LLC',
        address: 'P.O. Box 740256\nAtlanta, GA 30374-0256',
      },
      EXPERIAN: {
        name: 'Experian',
        address: 'P.O. Box 4500\nAllen, TX 75013',
      },
      TRANSUNION: {
        name: 'TransUnion LLC',
        address: 'P.O. Box 2000\nChester, PA 19016',
      },
    };
    
    const bureau = bureauAddresses[customData.bureau];
    if (bureau) {
      variables.bureau_name = bureau.name;
      variables.bureau_address = bureau.address;
    }
  }

  // Replace template variables
  let content = template.content;
  
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    content = content.replace(regex, value || '');
  }

  // Apply phrase variations if available
  if (template.phraseVariations) {
    content = applyPhraseVariations(content, template.phraseVariations);
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

/**
 * Apply random phrase variations to avoid template detection
 */
function applyPhraseVariations(content, variations) {
  if (!variations || typeof variations !== 'object') {
    return content;
  }

  let result = content;

  for (const [placeholder, options] of Object.entries(variations)) {
    if (Array.isArray(options) && options.length > 0) {
      // Pick a random variation
      const randomIndex = Math.floor(Math.random() * options.length);
      const selectedPhrase = options[randomIndex];
      
      // Replace the first occurrence of any option with the selected one
      // This handles cases where the template might have a default phrase
      for (const option of options) {
        if (result.includes(option)) {
          result = result.replace(option, selectedPhrase);
          break;
        }
      }
    }
  }

  return result;
}

/**
 * Get letter type recommendations based on item and round
 */
function getRecommendedLetterType(negativeItem, round, target) {
  // For furnishers (collections)
  if (target === 'FURNISHER') {
    if (negativeItem.accountType === 'COLLECTION' || negativeItem.accountType === 'MEDICAL') {
      return 'DEBT_VALIDATION';
    }
    if (negativeItem.accountType === 'LATE_PAYMENT') {
      return 'GOODWILL';
    }
  }

  // For bureaus based on round
  switch (round) {
    case 1:
      return 'INITIAL_DISPUTE';
    case 2:
      return 'METHOD_OF_VERIFICATION';
    case 3:
      return 'PROCEDURAL_VIOLATION';
    case 4:
      return 'LEGAL_ESCALATION';
    default:
      return 'INITIAL_DISPUTE';
  }
}

/**
 * Track letter usage for analytics
 */
async function trackLetterGeneration(userId, params) {
  const { letterType, success, tokens } = params;

  // This could be expanded to track metrics in a separate table
  // For now, it's handled by activity logs
  
  return true;
}

module.exports = {
  generateLetter,
  getTemplates,
  getTemplate,
  fillTemplate,
  applyPhraseVariations,
  getRecommendedLetterType,
  trackLetterGeneration,
};
