// ===========================================
// CREDITHOPPER - TIMING ANALYSIS ENGINE
// ===========================================
// Analyzes negative items and provides dispute recommendations
// based on 7-year rule, statute of limitations, and item type

const prisma = require('../config/database');

// ===========================================
// SOL (STATUTE OF LIMITATIONS) DATA
// ===========================================

const STATE_SOL_DATA = {
  // Format: { writtenContract, oralContract, promissoryNote, openAccount }
  'AL': { written: 6, oral: 6, promissory: 6, open: 3 },
  'AK': { written: 3, oral: 3, promissory: 3, open: 3 },
  'AZ': { written: 6, oral: 3, promissory: 6, open: 3 },
  'AR': { written: 5, oral: 3, promissory: 6, open: 5 },
  'CA': { written: 4, oral: 2, promissory: 4, open: 4 },
  'CO': { written: 6, oral: 6, promissory: 6, open: 6 },
  'CT': { written: 6, oral: 3, promissory: 6, open: 6 },
  'DE': { written: 3, oral: 3, promissory: 3, open: 3 },
  'DC': { written: 3, oral: 3, promissory: 3, open: 3 },
  'FL': { written: 5, oral: 4, promissory: 5, open: 4 },
  'GA': { written: 6, oral: 4, promissory: 6, open: 4 },
  'HI': { written: 6, oral: 6, promissory: 6, open: 6 },
  'ID': { written: 5, oral: 4, promissory: 5, open: 5 },
  'IL': { written: 10, oral: 5, promissory: 10, open: 5 },
  'IN': { written: 10, oral: 6, promissory: 10, open: 6 },
  'IA': { written: 10, oral: 5, promissory: 5, open: 5 },
  'KS': { written: 5, oral: 3, promissory: 5, open: 3 },
  'KY': { written: 15, oral: 5, promissory: 15, open: 5 },
  'LA': { written: 10, oral: 10, promissory: 5, open: 3 },
  'ME': { written: 6, oral: 6, promissory: 6, open: 6 },
  'MD': { written: 3, oral: 3, promissory: 6, open: 3 },
  'MA': { written: 6, oral: 6, promissory: 6, open: 6 },
  'MI': { written: 6, oral: 6, promissory: 6, open: 6 },
  'MN': { written: 6, oral: 6, promissory: 6, open: 6 },
  'MS': { written: 3, oral: 3, promissory: 3, open: 3 },
  'MO': { written: 10, oral: 5, promissory: 10, open: 5 },
  'MT': { written: 8, oral: 5, promissory: 8, open: 5 },
  'NE': { written: 5, oral: 4, promissory: 5, open: 4 },
  'NV': { written: 6, oral: 4, promissory: 6, open: 4 },
  'NH': { written: 3, oral: 3, promissory: 6, open: 3 },
  'NJ': { written: 6, oral: 6, promissory: 6, open: 6 },
  'NM': { written: 6, oral: 4, promissory: 6, open: 4 },
  'NY': { written: 6, oral: 6, promissory: 6, open: 6 },
  'NC': { written: 3, oral: 3, promissory: 5, open: 3 },
  'ND': { written: 6, oral: 6, promissory: 6, open: 6 },
  'OH': { written: 8, oral: 6, promissory: 8, open: 6 },
  'OK': { written: 5, oral: 3, promissory: 5, open: 3 },
  'OR': { written: 6, oral: 6, promissory: 6, open: 6 },
  'PA': { written: 4, oral: 4, promissory: 4, open: 4 },
  'RI': { written: 10, oral: 10, promissory: 10, open: 10 },
  'SC': { written: 3, oral: 3, promissory: 3, open: 3 },
  'SD': { written: 6, oral: 6, promissory: 6, open: 6 },
  'TN': { written: 6, oral: 6, promissory: 6, open: 6 },
  'TX': { written: 4, oral: 4, promissory: 4, open: 4 },
  'UT': { written: 6, oral: 4, promissory: 6, open: 4 },
  'VT': { written: 6, oral: 6, promissory: 14, open: 6 },
  'VA': { written: 5, oral: 3, promissory: 6, open: 3 },
  'WA': { written: 6, oral: 3, promissory: 6, open: 3 },
  'WV': { written: 10, oral: 5, promissory: 6, open: 5 },
  'WI': { written: 6, oral: 6, promissory: 10, open: 6 },
  'WY': { written: 10, oral: 8, promissory: 10, open: 8 },
};

// ===========================================
// ACCOUNT TYPE TO SOL TYPE MAPPING
// ===========================================

function getSOLType(accountType) {
  const mapping = {
    'CREDIT_CARD': 'open',
    'COLLECTION': 'open',
    'CHARGE_OFF': 'open',
    'LATE_PAYMENT': 'open',
    'MEDICAL': 'written',
    'AUTO_LOAN': 'written',
    'PERSONAL_LOAN': 'written',
    'STUDENT_LOAN': 'promissory',
    'MORTGAGE': 'written',
    'REPOSSESSION': 'written',
    'FORECLOSURE': 'written',
    'JUDGMENT': 'written',
    'TAX_LIEN': 'written',
    'BANKRUPTCY': 'written',
    'INQUIRY': 'open',
    'OTHER': 'open',
  };
  return mapping[accountType] || 'open';
}

// ===========================================
// MAIN TIMING ANALYSIS FUNCTION
// ===========================================

/**
 * Analyze timing and provide dispute recommendation for a negative item
 * @param {Object} negativeItem - The negative item to analyze
 * @param {string} userState - User's state (2-letter code)
 * @returns {Object} Recommendation with priority, reasoning, pros/cons
 */
async function analyzeItemTiming(negativeItem, userState) {
  const today = new Date();
  
  // Get DOFD (Date of First Delinquency) - critical for 7-year rule
  const dofd = negativeItem.dateOfFirstDelinquency 
    ? new Date(negativeItem.dateOfFirstDelinquency) 
    : null;
  
  // Get last activity date - critical for SOL
  const lastActivity = negativeItem.lastActivityDate 
    ? new Date(negativeItem.lastActivityDate) 
    : negativeItem.dateOpened 
      ? new Date(negativeItem.dateOpened) 
      : null;
  
  // Calculate 7-year credit reporting limit
  let daysUntilFallOff = null;
  let sevenYearMark = null;
  
  if (dofd) {
    sevenYearMark = new Date(dofd);
    sevenYearMark.setFullYear(sevenYearMark.getFullYear() + 7);
    daysUntilFallOff = Math.floor((sevenYearMark - today) / (1000 * 60 * 60 * 24));
  }
  
  // Calculate statute of limitations
  const solData = STATE_SOL_DATA[userState?.toUpperCase()] || STATE_SOL_DATA['CA'];
  const solType = getSOLType(negativeItem.accountType);
  const solYears = solData[solType];
  
  let solExpiration = null;
  let daysBeyondSol = null;
  let isBeyondSol = false;
  
  if (lastActivity && solYears) {
    solExpiration = new Date(lastActivity);
    solExpiration.setFullYear(solExpiration.getFullYear() + solYears);
    daysBeyondSol = Math.floor((today - solExpiration) / (1000 * 60 * 60 * 24));
    isBeyondSol = daysBeyondSol > 0;
  }
  
  // Build recommendation
  const recommendation = buildRecommendation(
    negativeItem,
    daysUntilFallOff,
    isBeyondSol,
    daysBeyondSol,
    solYears
  );
  
  // Calculate months until falls off
  const monthsUntilFallOff = daysUntilFallOff ? Math.floor(daysUntilFallOff / 30) : null;
  
  // Update the negative item with calculated fields
  await prisma.negativeItem.update({
    where: { id: negativeItem.id },
    data: {
      fallsOffDate: sevenYearMark,
      monthsUntilFallsOff: monthsUntilFallOff,
      solExpired: isBeyondSol,
      recommendation: recommendation.recommendationType,
      recommendationReason: recommendation.reasoning,
    },
  });
  
  return {
    itemId: negativeItem.id,
    creditorName: negativeItem.creditorName,
    accountType: negativeItem.accountType,
    
    // Timing data
    dateOfFirstDelinquency: dofd,
    lastActivityDate: lastActivity,
    fallsOffDate: sevenYearMark,
    daysUntilFallOff,
    monthsUntilFallOff,
    
    // SOL data
    userState,
    solYears,
    solExpiration,
    isBeyondSol,
    daysBeyondSol: isBeyondSol ? daysBeyondSol : null,
    
    // Recommendation
    ...recommendation,
  };
}

// ===========================================
// RECOMMENDATION BUILDER
// ===========================================

function buildRecommendation(item, daysUntilFallOff, isBeyondSol, daysBeyondSol, solYears) {
  let recommendation = {
    shouldDispute: true,
    priority: 'high',
    recommendationType: 'DISPUTE_NOW',
    reasoning: '',
    pros: [],
    cons: [],
    optimalAction: '',
    urgencyScore: 50, // 0-100
  };
  
  // Handle missing date of first delinquency
  if (daysUntilFallOff === null) {
    recommendation.shouldDispute = true;
    recommendation.priority = 'high';
    recommendation.recommendationType = 'DISPUTE_NOW';
    recommendation.reasoning = 'Unable to calculate fall-off date. Dispute to force them to verify or remove.';
    recommendation.pros = [
      'Missing date info could indicate reporting errors',
      'Bureau must validate accuracy if disputed',
      'May reveal they lack proper documentation',
    ];
    recommendation.cons = [
      'Unknown timeline for natural removal',
    ];
    recommendation.optimalAction = 'Dispute - missing dates may indicate reporting violations';
    recommendation.urgencyScore = 70;
    return recommendation;
  }
  
  // SCENARIO 1: Less than 4 months until automatic removal
  if (daysUntilFallOff <= 120 && daysUntilFallOff > 0) {
    recommendation.shouldDispute = false;
    recommendation.priority = 'wait';
    recommendation.recommendationType = 'WAIT';
    recommendation.reasoning = `This item will automatically fall off your report in ${Math.floor(daysUntilFallOff / 30)} months (${daysUntilFallOff} days). Disputing now is unlikely to be worth the effort.`;
    recommendation.pros = [
      `Guaranteed removal in ${Math.floor(daysUntilFallOff / 30)} months`,
      'Zero effort required',
      'No risk of re-aging the debt',
      'Save time for items that matter more',
    ];
    recommendation.cons = [
      `Stays on report until automatic removal`,
      `Continues affecting score for ${Math.floor(daysUntilFallOff / 30)} more months`,
    ];
    recommendation.optimalAction = 'Wait for automatic removal';
    recommendation.urgencyScore = 10;
    return recommendation;
  }
  
  // SCENARIO 2: 4-6 months for non-collections
  if (daysUntilFallOff <= 180 && daysUntilFallOff > 120 && item.accountType !== 'COLLECTION') {
    recommendation.shouldDispute = false;
    recommendation.priority = 'wait';
    recommendation.recommendationType = 'WAIT';
    recommendation.reasoning = 'Close to falling off naturally. Recommendation: Wait unless you urgently need credit.';
    recommendation.pros = [
      `Automatic removal in ~${Math.floor(daysUntilFallOff / 30)} months`,
      'No effort or cost required',
      'Avoid potentially re-alerting creditors',
    ];
    recommendation.cons = [
      `Delays score improvement by up to ${Math.floor(daysUntilFallOff / 30)} months`,
    ];
    recommendation.optimalAction = 'Wait unless you need immediate score improvement (mortgage application, etc.)';
    recommendation.urgencyScore = 20;
    return recommendation;
  }
  
  // SCENARIO 3: Beyond SOL but more than a year from falling off
  if (isBeyondSol && daysUntilFallOff > 365) {
    const yearsBeyond = Math.floor(daysBeyondSol / 365);
    const yearsRemaining = Math.floor(daysUntilFallOff / 365);
    
    recommendation.shouldDispute = true;
    recommendation.priority = 'very_high';
    recommendation.recommendationType = 'DISPUTE_NOW';
    recommendation.reasoning = `This debt is beyond the statute of limitations for your state (expired ${yearsBeyond > 0 ? yearsBeyond + ' year(s)' : daysBeyondSol + ' days'} ago) but won't fall off naturally for ${yearsRemaining}+ more years. STRONG DISPUTE CASE.`;
    recommendation.pros = [
      'Legally uncollectable - strong legal position',
      'They cannot sue you for this debt',
      `More than ${yearsRemaining} year(s) until automatic removal`,
      'High chance of successful dispute',
      'Collector may not have proper documentation',
    ];
    recommendation.cons = [
      'Requires time to write and send letters',
      'May need multiple rounds',
    ];
    recommendation.optimalAction = 'Dispute immediately - you have a strong case for removal';
    recommendation.urgencyScore = 95;
    return recommendation;
  }
  
  // SCENARIO 4: More than 2 years remaining
  if (daysUntilFallOff > 730) {
    const yearsRemaining = Math.floor(daysUntilFallOff / 365);
    
    recommendation.shouldDispute = true;
    recommendation.priority = 'high';
    recommendation.recommendationType = 'DISPUTE_NOW';
    recommendation.reasoning = `More than ${yearsRemaining} years until automatic removal. Definitely worth disputing.`;
    recommendation.pros = [
      `Could remove ${yearsRemaining}+ years of negative impact`,
      'Immediate score boost if successful',
      'Worth the time investment',
      'Multiple rounds available if needed',
    ];
    recommendation.cons = [
      'May require multiple dispute rounds',
      'Takes time and effort',
    ];
    recommendation.optimalAction = 'Dispute - potential for significant score improvement';
    recommendation.urgencyScore = 80;
    return recommendation;
  }
  
  // SCENARIO 5: 6 months to 2 years remaining
  if (daysUntilFallOff > 180) {
    const monthsRemaining = Math.floor(daysUntilFallOff / 30);
    
    recommendation.shouldDispute = true;
    recommendation.priority = 'medium';
    recommendation.recommendationType = 'OPTIONAL';
    recommendation.reasoning = 'Worthwhile to dispute, but weigh effort vs. time until natural removal.';
    recommendation.pros = [
      `Could remove up to ${monthsRemaining} months of impact`,
      'May improve score sooner',
      'Good practice for dispute process',
    ];
    recommendation.cons = [
      `Will fall off automatically in ${monthsRemaining} months anyway`,
      'Requires effort and potentially multiple rounds',
    ];
    recommendation.optimalAction = 'Your choice - dispute if you need faster results or are applying for credit soon';
    recommendation.urgencyScore = 50;
    return recommendation;
  }
  
  // SCENARIO 6: Collections with FTC-banned collector
  // (This would require checking furnisher data - future enhancement)
  
  // Default case - shouldn't reach here often
  recommendation.shouldDispute = true;
  recommendation.priority = 'medium';
  recommendation.recommendationType = 'OPTIONAL';
  recommendation.reasoning = 'Consider disputing based on your needs.';
  recommendation.optimalAction = 'Review your situation and decide';
  recommendation.urgencyScore = 40;
  
  return recommendation;
}

// ===========================================
// BATCH ANALYSIS FOR ALL USER ITEMS
// ===========================================

/**
 * Analyze all negative items for a user
 * @param {string} userId - User ID
 * @returns {Object} Summary and individual recommendations
 */
async function analyzeAllUserItems(userId) {
  // Get user with state info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { state: true },
  });
  
  if (!user?.state) {
    throw new Error('User state not set. Required for SOL calculations.');
  }
  
  // Get all active negative items
  const items = await prisma.negativeItem.findMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'DISPUTING'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  
  if (items.length === 0) {
    return {
      totalItems: 0,
      recommendations: [],
      summary: {
        disputeNow: 0,
        optional: 0,
        wait: 0,
        doNotDispute: 0,
      },
    };
  }
  
  // Analyze each item
  const recommendations = await Promise.all(
    items.map(item => analyzeItemTiming(item, user.state))
  );
  
  // Build summary
  const summary = {
    disputeNow: recommendations.filter(r => r.recommendationType === 'DISPUTE_NOW').length,
    optional: recommendations.filter(r => r.recommendationType === 'OPTIONAL').length,
    wait: recommendations.filter(r => r.recommendationType === 'WAIT').length,
    doNotDispute: recommendations.filter(r => r.recommendationType === 'DO_NOT_DISPUTE').length,
  };
  
  // Sort by urgency score (highest first)
  recommendations.sort((a, b) => b.urgencyScore - a.urgencyScore);
  
  return {
    totalItems: items.length,
    userState: user.state,
    recommendations,
    summary,
    priorityItems: recommendations.filter(r => r.urgencyScore >= 70),
  };
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  analyzeItemTiming,
  analyzeAllUserItems,
  STATE_SOL_DATA,
  getSOLType,
};
