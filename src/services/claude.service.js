// ===========================================
// CREDITHOPPER - CLAUDE API SERVICE
// ===========================================
// Integration with Anthropic's Claude API for letter generation
// Philosophy: Human-sounding, no jargon, burden on bureaus, unique each time

const Anthropic = require('@anthropic-ai/sdk');
const config = require('../config');

// Initialize Anthropic client
let anthropic = null;

function getClient() {
  if (!anthropic) {
    if (!config.anthropic.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    anthropic = new Anthropic({
      apiKey: config.anthropic.apiKey,
    });
  }
  return anthropic;
}

// ===========================================
// LETTER GENERATION
// ===========================================

/**
 * Generate a dispute letter using Claude
 * Returns human-sounding, unique letter with NO legal jargon
 */
async function generateDisputeLetter(params) {
  const {
    letterType,
    target,           // 'BUREAU' or 'FURNISHER'
    bureau,           // EQUIFAX, EXPERIAN, TRANSUNION
    negativeItem,     // The item being disputed
    user,             // User info for letter
    previousDisputes, // Previous dispute history (for follow-ups)
    customNotes,      // Any custom context from user
  } = params;

  const client = getClient();

  // Build the system prompt - this is the key to human-sounding letters
  const systemPrompt = buildHumanLetterSystemPrompt();
  
  // Build the user prompt with all context
  const userPrompt = buildLetterPrompt({
    letterType,
    target,
    bureau,
    negativeItem,
    user,
    previousDisputes,
    customNotes,
  });

  try {
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    // Extract the letter content
    const letterContent = response.content[0]?.text || '';
    
    // Clean up the response
    const cleanedLetter = cleanLetterResponse(letterContent);

    return {
      success: true,
      letter: cleanedLetter,
      letterType,
      target,
      bureau,
      metadata: {
        generatedAt: new Date().toISOString(),
        wordCount: cleanedLetter.split(/\s+/).length,
      },
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  } catch (error) {
    console.error('Claude API error:', error);
    
    if (error.status === 401) {
      throw new Error('Invalid Claude API key');
    }
    if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    if (error.status === 500) {
      throw new Error('Claude API is temporarily unavailable');
    }
    
    throw new Error(`Letter generation failed: ${error.message}`);
  }
}

/**
 * System prompt that creates human-sounding letters
 */
function buildHumanLetterSystemPrompt() {
  return `You write dispute letters that sound like they come from a regular person, not a credit repair company or lawyer.

CRITICAL RULES:

1. SOUND HUMAN
- Write like a normal person who found something wrong on their credit report
- Use everyday language - the way someone would write an email
- Vary between confused, frustrated, polite, or matter-of-fact tones
- Keep it SHORT - 3-6 sentences max for the body
- Include natural imperfections (it's okay to be slightly informal)

2. NO LEGAL JARGON
- NEVER use: "pursuant to", "hereby", "aforementioned", "15 U.S.C.", "FCRA", "FDCPA", "Section 611"
- NEVER cite laws or statutes
- NEVER use formal legal phrases
- Just say what a regular person would say

3. BURDEN IS ON THEM
- User does NOT explain themselves
- User does NOT provide reasons or excuses
- User does NOT justify their dispute
- Just state: "I don't recognize this" or "This isn't accurate" - that's it
- Let THEM prove it's valid

4. NO TEMPLATES
- Every letter must be unique
- Vary your opening every time
- Vary sentence structure
- Vary tone (sometimes confused, sometimes annoyed, sometimes brief)
- Mix up word choices

5. FORMAT
- NO signature line (user will sign themselves)
- NO "Sincerely" or closings
- Just the letter body
- Keep paragraphs short

GOOD EXAMPLES:
- "I was looking at my credit report and there's an account from [Company] that I don't recognize. I've never had anything with them. Can you look into this?"
- "There's a [Company] account showing on my report. This isn't mine. Please check on this."
- "I pulled my credit and found something from [Company] for $X. I don't know what this is. I need you to verify this is actually mine."

BAD EXAMPLES (NEVER DO THIS):
- "Pursuant to my rights under the Fair Credit Reporting Act..."
- "I am formally disputing the following account..."
- "Under 15 U.S.C. § 1681, I demand..."
- "Please be advised that..."`;
}

/**
 * Build the user prompt with context
 */
function buildLetterPrompt(params) {
  const {
    letterType,
    target,
    bureau,
    negativeItem,
    user,
    previousDisputes,
    customNotes,
    round = 1,
  } = params;

  // Determine effective round based on previous disputes
  const effectiveRound = previousDisputes?.length > 0 
    ? Math.min(previousDisputes.length + 1, 4) 
    : round;

  // Random tone selector for variation (adjust by round)
  const tonesByRound = {
    1: ['confused', 'polite', 'matter-of-fact'],
    2: ['questioning', 'frustrated', 'polite but firm'],
    3: ['firm', 'disappointed', 'assertive'],
    4: ['formal', 'serious', 'demanding'],
  };
  const tones = tonesByRound[effectiveRound] || tonesByRound[1];
  const selectedTone = tones[Math.floor(Math.random() * tones.length)];

  // Random opening style
  const openingStyles = [
    'Start by saying you were looking at your credit report',
    'Start by saying you recently checked your credit',
    'Start by saying you pulled your report',
    'Start by getting straight to the point about the account',
    'Start by mentioning you noticed something wrong',
  ];
  const selectedOpening = openingStyles[Math.floor(Math.random() * openingStyles.length)];

  let prompt = `Write a ${letterType.replace(/_/g, ' ').toLowerCase()} letter with these details:

DISPUTE ROUND: ${effectiveRound} of 4
TONE FOR THIS LETTER: ${selectedTone}
OPENING STYLE: ${selectedOpening}

TARGET: ${target === 'BUREAU' ? `${bureau} (credit bureau)` : 'Collection agency/creditor'}

ACCOUNT BEING DISPUTED:
- Company Name: ${negativeItem.creditorName}
${negativeItem.originalCreditor ? `- Original Creditor: ${negativeItem.originalCreditor}` : ''}
- Account Number (last 4): ${negativeItem.accountNumberMasked || 'Unknown'}
- Amount: ${negativeItem.balance ? `$${parseFloat(negativeItem.balance).toLocaleString()}` : 'Unknown'}
- Type: ${formatAccountType(negativeItem.accountType)}

`;

  // Add previous dispute history for rounds 2+
  if (previousDisputes && previousDisputes.length > 0) {
    prompt += `\nPREVIOUS DISPUTE HISTORY:\n`;
    previousDisputes.forEach((d, i) => {
      prompt += `- Round ${i + 1}: Sent ${d.mailedAt ? new Date(d.mailedAt).toLocaleDateString() : 'unknown'}, Response: ${d.responseType || 'none'}\n`;
    });
    prompt += '\n';
  }

  // Add letter-type specific guidance
  prompt += getLetterTypeGuidance(letterType, previousDisputes, effectiveRound);

  // Add custom notes if provided
  if (customNotes) {
    prompt += `\nUSER'S NOTES (incorporate naturally if relevant): ${customNotes}\n`;
  }

  prompt += `
REMEMBER:
- Sound like a regular person, not a lawyer${effectiveRound < 4 ? ' (NO legal citations yet)' : ''}
- Keep it ${effectiveRound === 1 ? 'short (3-6 sentences)' : effectiveRound === 4 ? 'thorough (1-2 pages)' : 'medium length'}
- Don't explain or justify - just dispute
- No signature or closing
- Make it unique - don't sound like a template

Write only the letter body now:`;

  return prompt;
}

/**
 * Get guidance based on letter type and round
 * Enhanced with progressive escalation strategy
 */
function getLetterTypeGuidance(letterType, previousDisputes, round = 1) {
  // Round-based guidance for bureau disputes
  const roundGuidance = {
    1: `
ROUND 1 - THE CONFUSED CONSUMER:
- Sound genuinely confused
- You don't recognize this account
- OR this information isn't accurate
- Ask them to look into it / verify it
- That's it - don't explain why
- NO legal language at all
- Keep it SHORT (half page max)`,

    2: `
ROUND 2 - METHOD OF VERIFICATION:
- Reference your previous dispute date
- They said "verified" but didn't explain HOW
- Ask specific questions:
  * "How exactly did you verify this?"
  * "Who did you contact?"
  * "What documentation did they provide?"
  * "Was this reviewed by a person or automated?"
- Express frustration but stay polite
- Still NO legal citations
- Medium length (3/4 page)`,

    3: `
ROUND 3 - PROCEDURAL ISSUES:
- Reference BOTH previous disputes with dates
- Document their failures:
  * Late responses
  * Vague verification without details
  * No proof provided
- NOW you can mention "I understand the Fair Credit Reporting Act requires..."
- Soft warning that you may need to escalate
- Still NO specific section numbers yet
- Firmer tone, 1 page`,

    4: `
ROUND 4 - FINAL DEMAND:
- Complete timeline of ALL disputes with dates
- NOW use full legal language:
  * "Under FCRA §611(a)..."
  * "Your violation of §623..."
  * Reference statutory damages ($100-$1,000 per violation)
- Clear DEMAND: Delete within 15 days
- State consequences: CFPB complaint, State AG, potential lawsuit
- CC to regulatory agencies
- Very formal, 1-2 pages`,
  };

  // Standard guidance by letter type
  const guidance = {
    INITIAL_DISPUTE: roundGuidance[1],

    DEBT_VALIDATION: `
DEBT VALIDATION (to Furnisher):
- You're disputing this debt
- You want them to prove they own it and can collect
- Ask for:
  * Original signed contract
  * Complete payment history
  * Proof they own the debt
  * License to collect in your state
- DON'T acknowledge the debt is valid
- State they must cease collection until validated`,

    METHOD_OF_VERIFICATION: roundGuidance[2],

    PROCEDURAL_VIOLATION: roundGuidance[3],

    LEGAL_ESCALATION: roundGuidance[4],

    FOLLOW_UP: roundGuidance[round] || roundGuidance[2],

    GOODWILL: `
GOODWILL REQUEST:
- Be polite and appreciative
- Acknowledge the item (this is the exception)
- Briefly mention hardship if relevant
- Ask if they'd consider removing as a one-time courtesy
- Highlight positive history with them
- Promise continued on-time payments
- Humble, sincere tone`,

    EARLY_EXCLUSION: `
MEDICAL DEBT EXCLUSION:
- You noticed a medical account on your report
- You believe it should be removed under FCRA medical debt rules
- Ask them to verify if it qualifies for exclusion
- Keep it simple and polite`,
  };

  // If we have previous disputes, escalate based on count
  if (previousDisputes && previousDisputes.length > 0) {
    const disputeRound = previousDisputes.length + 1;
    if (disputeRound >= 2 && disputeRound <= 4) {
      return roundGuidance[disputeRound];
    }
  }

  return guidance[letterType] || guidance.INITIAL_DISPUTE;
}

/**
 * Format account type for human readability
 */
function formatAccountType(type) {
  const formats = {
    COLLECTION: 'Collection account',
    CHARGE_OFF: 'Charged-off account',
    LATE_PAYMENT: 'Late payment',
    MEDICAL: 'Medical bill',
    CREDIT_CARD: 'Credit card',
    AUTO_LOAN: 'Auto loan',
    PERSONAL_LOAN: 'Personal loan',
    STUDENT_LOAN: 'Student loan',
    MORTGAGE: 'Mortgage',
    REPOSSESSION: 'Repossession',
    FORECLOSURE: 'Foreclosure',
    BANKRUPTCY: 'Bankruptcy',
    JUDGMENT: 'Judgment',
    TAX_LIEN: 'Tax lien',
    INQUIRY: 'Hard inquiry',
    OTHER: 'Account',
  };
  return formats[type] || 'Account';
}

/**
 * Clean up the letter response
 */
function cleanLetterResponse(content) {
  let letter = content.trim();
  
  // Remove any markdown
  letter = letter.replace(/```[\s\S]*?```/g, '');
  letter = letter.replace(/```/g, '');
  
  // Remove any XML tags
  letter = letter.replace(/<[^>]+>/g, '');
  
  // Remove any "Dear..." if Claude added it (user will add recipient)
  letter = letter.replace(/^Dear[^,\n]*,?\s*/i, '');
  
  // Remove any signature lines Claude might have added
  letter = letter.replace(/\n\s*(Sincerely|Best|Thanks|Thank you|Regards)[,\s]*\n?.*$/gi, '');
  letter = letter.replace(/\n\s*\[Your [Nn]ame\].*$/g, '');
  letter = letter.replace(/\n\s*_{2,}.*$/g, '');
  
  // Clean up extra whitespace
  letter = letter.replace(/\n{3,}/g, '\n\n');
  
  return letter.trim();
}

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
  },
  EXPERIAN: {
    name: 'Experian',
    street: 'P.O. Box 4500',
    city: 'Allen',
    state: 'TX',
    zip: '75013',
  },
  TRANSUNION: {
    name: 'TransUnion LLC',
    street: 'P.O. Box 2000',
    city: 'Chester',
    state: 'PA',
    zip: '19016',
  },
};

/**
 * Get bureau address
 */
function getBureauAddress(bureau) {
  return BUREAU_ADDRESSES[bureau] || null;
}

/**
 * Format a complete letter with user info and recipient
 */
function formatCompleteLetter(params) {
  const {
    letterBody,
    user,
    recipient,
    bureau,
    includeDate = true,
  } = params;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get recipient address
  let recipientBlock = '';
  if (recipient) {
    recipientBlock = `${recipient.name}\n${recipient.street}\n${recipient.city}, ${recipient.state} ${recipient.zip}`;
  } else if (bureau && BUREAU_ADDRESSES[bureau]) {
    const addr = BUREAU_ADDRESSES[bureau];
    recipientBlock = `${addr.name}\n${addr.street}\n${addr.city}, ${addr.state} ${addr.zip}`;
  }

  // Build user block
  const userBlock = [
    user.fullName || `${user.firstName} ${user.lastName}`,
    user.street,
    `${user.city}, ${user.state} ${user.zipCode}`,
  ].filter(Boolean).join('\n');

  // Assemble letter
  let completeLetter = '';
  
  // User info at top
  if (userBlock) {
    completeLetter += userBlock + '\n\n';
  }
  
  // Date
  if (includeDate) {
    completeLetter += today + '\n\n';
  }
  
  // Recipient
  if (recipientBlock) {
    completeLetter += recipientBlock + '\n\n';
  }
  
  // SSN reference for bureaus
  if (bureau && user.ssnLast4) {
    completeLetter += `SSN: XXX-XX-${user.ssnLast4}\n`;
  }
  if (user.dateOfBirth) {
    completeLetter += `DOB: ${user.dateOfBirth}\n`;
  }
  if (bureau && (user.ssnLast4 || user.dateOfBirth)) {
    completeLetter += '\n';
  }
  
  // Letter body
  completeLetter += letterBody + '\n\n';
  
  // Signature line (blank for user to sign)
  completeLetter += '\n\n________________________\n';
  completeLetter += user.fullName || `${user.firstName} ${user.lastName}`;

  return completeLetter;
}

// ===========================================
// REGENERATE WITH DIFFERENT VARIATION
// ===========================================

/**
 * Generate a new variation of the same letter
 */
async function regenerateLetter(params) {
  // Simply call generateDisputeLetter again - 
  // the random tone/opening selection ensures variation
  return generateDisputeLetter(params);
}

// ===========================================
// LETTER TEMPLATES (FALLBACK)
// ===========================================

/**
 * Get a basic template if AI is unavailable
 * These are intentionally varied and human-sounding
 */
function getFallbackTemplate(letterType, negativeItem) {
  const templates = {
    INITIAL_DISPUTE: [
      `I was looking at my credit report and noticed an account from ${negativeItem.creditorName} that I don't recognize. I don't have any record of this. Can you please look into this and verify it's actually mine?`,
      `There's an account showing from ${negativeItem.creditorName} on my credit report. I don't know what this is - I've never dealt with them. Please check on this.`,
      `I pulled my credit report and found something from ${negativeItem.creditorName}. This doesn't look right to me. I'd like you to verify this account.`,
    ],
    DEBT_VALIDATION: [
      `I received something about a debt from ${negativeItem.creditorName}. I'm not sure this is mine. Before anything else, I need you to send me proof that this debt is valid and that you have the right to collect it.`,
      `You're contacting me about an account but I don't recognize it. Please send me documentation proving this is my debt and that you own it.`,
    ],
    METHOD_OF_VERIFICATION: [
      `I disputed an account from ${negativeItem.creditorName} and you said it was verified. But you didn't tell me how you verified it. What did you actually do? Who did you contact?`,
      `You told me the ${negativeItem.creditorName} account was verified, but I need to know what that means. How did you verify it? What documents did you look at?`,
    ],
  };

  const options = templates[letterType] || templates.INITIAL_DISPUTE;
  return options[Math.floor(Math.random() * options.length)];
}

module.exports = {
  generateDisputeLetter,
  regenerateLetter,
  formatCompleteLetter,
  getBureauAddress,
  getFallbackTemplate,
  getClient,
  BUREAU_ADDRESSES,
};
