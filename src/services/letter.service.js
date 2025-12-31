// ===========================================
// CREDITHOPPER - LETTER GENERATION SERVICE
// ===========================================
// Generates personalized dispute letters using Claude API
// Each letter is unique and human-sounding

const Anthropic = require('@anthropic-ai/sdk');
const prisma = require('../config/database');
const config = require('../config');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: config.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
});

// ===========================================
// SYSTEM PROMPTS FOR EACH ROUND
// ===========================================

const ROUND_PROMPTS = {
  // Round 1: The Confused Consumer
  1: `You are helping a real person write a dispute letter to a credit bureau. This is their FIRST letter.

CRITICAL RULES:
1. Sound like a REAL PERSON, not a credit repair agency template
2. NO legal jargon or FCRA citations in this round
3. Keep it SHORT (half page maximum, under 250 words)
4. Sound confused, polite, asking for help
5. Use contractions (don't, I'm, can't, etc.)
6. Vary your language - never use the same phrases as other letters

TONE: Polite, slightly confused, genuine

STRUCTURE:
- Brief greeting
- "I noticed this on my credit report..."
- Describe what doesn't look right or what you don't recognize
- If they provided personal context (buying a house, etc.), mention it naturally
- "Could you please look into this?"
- Thank them for help
- Sign off

DO NOT:
- Cite FCRA sections
- Use legal terminology
- Make demands or threats
- Sound like a template
- Use formal language like "pursuant to" or "hereby"
- Include phrases like "to whom it may concern" or "re: dispute"

PERSONALIZATION:
- Use their actual situation (provided in context)
- Reference their life circumstances naturally
- Make each letter unique

EXAMPLE OPENING STYLES (rotate between these):
- "I was reviewing my credit report and something caught my attention..."
- "I recently checked my credit report because [their reason] and I noticed..."
- "I'm a bit confused about something on my credit report..."
- "I was going through my credit report and saw..."
- "Hi, I'm hoping you can help me understand something..."`,

  // Round 2: Method of Verification Request
  2: `You are helping write a follow-up dispute letter. The bureau responded to Round 1 saying they "verified" the item, but the user still doesn't think it's accurate.

CRITICAL RULES:
1. Still sound human, but slightly more frustrated
2. Minimal legal language - phrase things as "I read that..." or "I've learned that..."
3. Ask HOW they verified (this is the key)
4. Express genuine confusion about the "verification" process
5. Medium length (under 350 words)

TONE: Polite but questioning, slightly frustrated

KEY QUESTIONS TO INCLUDE (vary how you ask):
- "How exactly did you verify this account?"
- "Who did you contact to verify?"
- "What documentation did they provide?"
- "Was this reviewed by a person, or was it just an automated confirmation?"

STRUCTURE:
- Reference previous dispute date
- Express that you're still concerned
- Mention you've been reading about the verification process
- Ask the key questions listed above
- Request specific documentation
- Thank them but remain firm

DO NOT YET:
- Cite specific FCRA section numbers
- Make legal threats
- Be aggressive or demanding
- Sound like a form letter`,

  // Round 3: Procedural Violation Notice
  3: `You are helping write a third dispute letter. Previous attempts haven't resolved the issue. The user is now documenting problems with the process.

CRITICAL RULES:
1. Firmer tone, but still professional
2. Document specific failures in their process
3. Light FCRA references are okay now ("I understand the Fair Credit Reporting Act requires...")
4. Medium to long length (under 450 words)
5. Soft warning that you're aware of your rights

TONE: Professional, firm, disappointed but not hostile

STRUCTURE:
- Reference specific dates of previous disputes
- Document what was wrong with their responses
- Note any procedural failures:
  * Late responses
  * Vague "verification" without details
  * Failure to provide method of verification
  * Inconsistent information
- Mention you're "learning about" FCRA requirements
- Request deletion based on procedural failures
- Soft mention that you may need to escalate if not resolved

APPROPRIATE LANGUAGE NOW:
- "I understand the Fair Credit Reporting Act requires..."
- "According to federal law..."
- "I've learned that bureaus must..."
- "The FCRA states that..."

STILL AVOID:
- Specific statutory citations (§611, etc.)
- Legal threats of lawsuits
- Aggressive demands`,

  // Round 4: Final Demand
  4: `You are helping write a FINAL demand letter before potential legal action. This is serious but still professional.

CRITICAL RULES:
1. Formal, serious tone
2. Full FCRA citations are appropriate now
3. Document ALL previous attempts with dates
4. Clear statement of violations
5. Specific demand for deletion with deadline
6. Clear statement of next steps if not resolved
7. Longer letter (up to 600 words)

TONE: Formal, serious, professional, clear intent to escalate

STRUCTURE:
- Formal salutation
- Complete timeline of all previous disputes with dates
- List of specific FCRA violations:
  * §611(a) - Duty to investigate
  * §623 - Furnisher requirements for accuracy
  * §616 - Statutory damages for willful non-compliance
  * §617 - Damages for negligent non-compliance
- Documentation of their failures
- Calculation of potential statutory damages exposure ($100-$1,000 per violation)
- FINAL DEMAND: Delete within 15 days
- Clear statement: Failure to resolve will result in regulatory complaints
- Mention preparation to file with CFPB and State Attorney General
- CC to regulatory agencies (CFPB, FTC, State AG)

APPROPRIATE LANGUAGE:
- "Under FCRA §611(a)..."
- "Your violation of §623..."
- "Statutory damages under §616..."
- "Failure to comply will result in..."
- "I am prepared to file complaints with..."`,

  // Debt Validation Letter (to Furnisher/Collector)
  'debt_validation': `You are helping write a debt validation letter to a debt collector or creditor. This is sent directly to the furnisher, not the bureau.

CRITICAL RULES:
1. Professional and firm
2. Know your rights under FDCPA
3. Request specific documentation
4. DO NOT admit the debt is yours
5. Medium length (under 400 words)

TONE: Professional, informed, firm but not aggressive

STRUCTURE:
- State you received their communication
- Neither confirm nor deny the debt
- Exercise your right to request validation under FDCPA
- Request specific documents:
  * Original signed contract
  * Complete payment history
  * Proof they own the debt (if collection agency)
  * License to collect in your state
- State that you expect them to cease collection until validated
- Note that reporting unvalidated debt is a violation

KEY REQUESTS:
- "Please provide validation of this debt including..."
- "I request the original signed agreement..."
- "Please provide proof of your authority to collect..."
- "Please confirm the debt is within the statute of limitations..."`,

  // Goodwill Letter (for late payments with otherwise good history)
  'goodwill': `You are helping write a goodwill letter requesting removal of a late payment from an otherwise good account.

CRITICAL RULES:
1. Humble and appreciative tone
2. Take responsibility (if applicable)
3. Emphasize long positive history
4. Explain the circumstances
5. Keep it personal and heartfelt
6. Short to medium length (under 300 words)

TONE: Humble, appreciative, sincere

STRUCTURE:
- Express appreciation for the relationship
- Acknowledge the late payment
- Briefly explain what happened (if circumstances warrant)
- Highlight your positive history with them
- Explain why removal matters (buying home, etc.)
- Request goodwill removal
- Promise continued on-time payments
- Thank them sincerely

DO NOT:
- Sound entitled
- Threaten or demand
- Cite laws or regulations
- Sound like a template`,
};

// ===========================================
// VARIATION ELEMENTS
// ===========================================

const VARIATIONS = {
  openings: [
    "I recently reviewed my credit report and noticed",
    "While checking my credit report, I came across",
    "I was looking over my credit report and found",
    "I noticed something on my credit report that concerns me",
    "I'm writing about something I saw on my credit report",
    "I hope you can help me with something I found on my credit report",
    "I'm reaching out about an item on my credit report",
  ],
  closings: [
    "Thank you for your help with this matter.",
    "I appreciate your assistance in resolving this.",
    "Thank you for looking into this for me.",
    "I appreciate your time and attention to this issue.",
    "Thank you for your help in clearing this up.",
    "I look forward to hearing from you soon.",
    "Thanks for taking the time to review this.",
  ],
  uncertaintyPhrases: [
    "I don't recognize this",
    "This doesn't look familiar to me",
    "I have no record of this",
    "I'm not sure what this is",
    "This doesn't seem right to me",
    "I don't remember this account",
    "This doesn't match my records",
  ],
};

// ===========================================
// MAIN LETTER GENERATION FUNCTION
// ===========================================

/**
 * Generate a personalized dispute letter using Claude API
 * @param {Object} params - Generation parameters
 * @returns {Object} Generated letter and metadata
 */
async function generateDisputeLetter(params) {
  const {
    dispute,
    negativeItem,
    user,
    previousDisputes = [],
  } = params;
  
  const round = dispute.round || 1;
  const target = dispute.target; // BUREAU or FURNISHER
  const strategy = dispute.strategy || 'INITIAL_DISPUTE';
  
  // Select appropriate system prompt
  let systemPrompt;
  if (strategy === 'GOODWILL_REQUEST') {
    systemPrompt = ROUND_PROMPTS['goodwill'];
  } else if (strategy === 'DEBT_VALIDATION' || target === 'FURNISHER') {
    systemPrompt = ROUND_PROMPTS['debt_validation'];
  } else {
    systemPrompt = ROUND_PROMPTS[round] || ROUND_PROMPTS[1];
  }
  
  // Add variation guidance
  systemPrompt += `

VARIATION REQUIREMENT:
Every letter must be unique. Vary your:
- Opening sentence structure
- Transition phrases
- Closing statements
- Word choices
- Sentence lengths

Never use the exact same opening or closing twice. Make it sound genuinely personal.`;

  // Build user context for the prompt
  const userContext = buildUserContext(user, negativeItem, dispute, previousDisputes);
  
  // Generate letter with Claude
  const letter = await callClaudeAPI(systemPrompt, userContext);
  
  // Update dispute with generated letter
  await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      letterContent: letter,
      letterTemplate: `round_${round}_${target.toLowerCase()}`,
      letterGeneratedAt: new Date(),
    },
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      userId: user.id,
      action: 'LETTER_GENERATED',
      description: `Generated Round ${round} ${target.toLowerCase()} letter for ${negativeItem.creditorName}`,
      entityType: 'dispute',
      entityId: dispute.id,
    },
  });
  
  return {
    letter,
    round,
    target,
    strategy,
    generatedAt: new Date(),
    wordCount: letter.split(/\s+/).length,
  };
}

// ===========================================
// BUILD USER CONTEXT FOR PROMPT
// ===========================================

function buildUserContext(user, negativeItem, dispute, previousDisputes) {
  // Format user's personal situation
  const personalSituation = dispute.userContext 
    ? (typeof dispute.userContext === 'string' 
        ? dispute.userContext 
        : JSON.stringify(dispute.userContext))
    : null;
  
  // Format previous dispute history
  const disputeHistory = previousDisputes.map(d => ({
    round: d.round,
    dateSent: d.mailedAt,
    responseType: d.responseType,
    responseDate: d.responseDate,
  }));
  
  // Build the context object
  const context = {
    // User info
    userName: `${user.firstName} ${user.lastName}`,
    userAddress: user.street 
      ? `${user.street}, ${user.city}, ${user.state} ${user.zipCode}` 
      : '[Address needed]',
    userState: user.state,
    
    // Item info
    itemType: negativeItem.accountType,
    creditorName: negativeItem.creditorName,
    originalCreditor: negativeItem.originalCreditor,
    accountNumber: negativeItem.accountNumberMasked || 'Not provided',
    balance: negativeItem.balance 
      ? `$${parseFloat(negativeItem.balance).toFixed(2)}` 
      : 'Unknown',
    accountStatus: negativeItem.accountStatus,
    dateOpened: negativeItem.dateOpened 
      ? new Date(negativeItem.dateOpened).toLocaleDateString() 
      : 'Unknown',
    
    // Bureau info
    bureau: dispute.bureau || negativeItem.onEquifax 
      ? 'Equifax' 
      : negativeItem.onExperian 
        ? 'Experian' 
        : 'TransUnion',
    
    // Personal situation
    personalSituation,
    whyDisputing: dispute.disputeReasons || [],
    
    // Previous dispute history (for rounds 2+)
    previousDisputes: disputeHistory,
    hasPreviousDisputes: disputeHistory.length > 0,
  };
  
  return `
LETTER CONTEXT:
---------------
User Name: ${context.userName}
User Address: ${context.userAddress}
User State: ${context.userState}

ITEM TO DISPUTE:
Account Type: ${context.itemType}
Creditor/Company: ${context.creditorName}
${context.originalCreditor ? `Original Creditor: ${context.originalCreditor}` : ''}
Account Number: ${context.accountNumber}
Balance: ${context.balance}
Status: ${context.accountStatus || 'Unknown'}
Date Opened: ${context.dateOpened}

TARGET: ${dispute.target === 'BUREAU' ? `${context.bureau} Credit Bureau` : context.creditorName}

${context.personalSituation ? `PERSONAL SITUATION: ${context.personalSituation}` : ''}

${context.whyDisputing.length > 0 ? `REASONS FOR DISPUTE: ${context.whyDisputing.join(', ')}` : ''}

${context.hasPreviousDisputes ? `
PREVIOUS DISPUTE HISTORY:
${context.previousDisputes.map(d => 
  `- Round ${d.round}: Sent ${d.dateSent ? new Date(d.dateSent).toLocaleDateString() : 'unknown'}, Response: ${d.responseType || 'none'}`
).join('\n')}
` : ''}

Please generate a dispute letter based on this context. Remember to make it sound like the person wrote it themselves, not like a template.`;
}

// ===========================================
// CLAUDE API CALL
// ===========================================

async function callClaudeAPI(systemPrompt, userContext) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContext,
        },
      ],
    });
    
    // Extract text from response
    const letter = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n');
    
    return letter;
  } catch (error) {
    console.error('[LetterGen] Claude API error:', error);
    throw new Error(`Failed to generate letter: ${error.message}`);
  }
}

// ===========================================
// GENERATE FOR MULTIPLE ITEMS (BATCH)
// ===========================================

/**
 * Generate letters for multiple items at once
 * @param {Array} disputeIds - Array of dispute IDs
 * @param {string} userId - User ID
 * @returns {Array} Generated letters
 */
async function generateBatchLetters(disputeIds, userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  
  if (!user) {
    throw new Error('User not found');
  }
  
  const results = [];
  
  for (const disputeId of disputeIds) {
    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { negativeItem: true },
    });
    
    if (!dispute) {
      results.push({ disputeId, error: 'Dispute not found' });
      continue;
    }
    
    // Get previous disputes for this item
    const previousDisputes = await prisma.dispute.findMany({
      where: {
        negativeItemId: dispute.negativeItemId,
        id: { not: disputeId },
        status: { in: ['COMPLETED', 'RESPONSE_RECEIVED', 'ESCALATED'] },
      },
      orderBy: { round: 'asc' },
    });
    
    try {
      const result = await generateDisputeLetter({
        dispute,
        negativeItem: dispute.negativeItem,
        user,
        previousDisputes,
      });
      
      results.push({
        disputeId,
        success: true,
        ...result,
      });
      
      // Small delay between API calls to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      results.push({
        disputeId,
        success: false,
        error: error.message,
      });
    }
  }
  
  return results;
}

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  generateDisputeLetter,
  generateBatchLetters,
  ROUND_PROMPTS,
  VARIATIONS,
};
