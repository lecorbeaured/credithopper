// ===========================================
// CREDITHOPPER - CLAUDE API SERVICE
// ===========================================
// Integration with Anthropic's Claude API for letter generation

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
 */
async function generateDisputeLetter(params) {
  const {
    letterType,
    target,           // 'BUREAU' or 'FURNISHER'
    bureau,           // EQUIFAX, EXPERIAN, TRANSUNION
    round,            // 1-4
    negativeItem,     // The item being disputed
    user,             // User info for letter
    previousDisputes, // Previous dispute history
    customInstructions, // Any custom notes from user
  } = params;

  const client = getClient();

  // Build the system prompt
  const systemPrompt = buildSystemPrompt();
  
  // Build the user prompt with all context
  const userPrompt = buildLetterPrompt({
    letterType,
    target,
    bureau,
    round,
    negativeItem,
    user,
    previousDisputes,
    customInstructions,
  });

  try {
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: config.anthropic.maxTokens,
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
    
    // Parse out any metadata Claude might have included
    const { letter, metadata } = parseLetterResponse(letterContent);

    return {
      success: true,
      letter,
      metadata,
      usage: {
        inputTokens: response.usage?.input_tokens,
        outputTokens: response.usage?.output_tokens,
      },
    };
  } catch (error) {
    console.error('Claude API error:', error);
    
    // Handle specific API errors
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
 * Build the system prompt for letter generation
 */
function buildSystemPrompt() {
  return `You are an expert credit repair letter writer with deep knowledge of:
- Fair Credit Reporting Act (FCRA) - 15 U.S.C. § 1681
- Fair Debt Collection Practices Act (FDCPA) - 15 U.S.C. § 1692
- Consumer credit rights and dispute procedures
- Effective dispute strategies that get results

Your task is to generate professional, legally-sound dispute letters that:
1. Are personalized to the specific account and situation
2. Cite relevant laws and regulations accurately
3. Use varied language to avoid template detection by bureaus
4. Are assertive but professional in tone
5. Include specific, actionable demands
6. Follow the appropriate strategy for the dispute round

IMPORTANT GUIDELINES:
- Never use the exact same phrasing twice across letters
- Vary sentence structure and word choice
- Include specific details from the account information provided
- Always include the user's full mailing address
- Format dates as Month Day, Year (e.g., January 15, 2025)
- Keep letters concise but thorough (typically 1-2 pages)
- Do not include any XML tags or metadata markers in the final letter
- The letter should be ready to print and mail as-is

ROUND STRATEGIES:
- Round 1: Initial dispute - Request investigation and verification
- Round 2: Method of Verification - Demand proof of investigation procedures
- Round 3: Procedural Violation - Cite specific FCRA violations
- Round 4: Legal Escalation - Formal demand with legal action warning`;
}

/**
 * Build the user prompt with all context
 */
function buildLetterPrompt(params) {
  const {
    letterType,
    target,
    bureau,
    round,
    negativeItem,
    user,
    previousDisputes,
    customInstructions,
  } = params;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Get bureau address
  const bureauAddresses = {
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

  const bureauInfo = bureauAddresses[bureau] || bureauAddresses.EQUIFAX;

  let prompt = `Generate a ${letterType} dispute letter with the following details:

TODAY'S DATE: ${today}

DISPUTE TARGET: ${target}
${target === 'BUREAU' ? `BUREAU: ${bureau}
BUREAU ADDRESS:
${bureauInfo.name}
${bureauInfo.street}
${bureauInfo.city}, ${bureauInfo.state} ${bureauInfo.zip}` : ''}

DISPUTE ROUND: ${round}

USER INFORMATION:
Name: ${user.firstName} ${user.lastName}
Address: ${user.street || '[Street Address]'}
City, State ZIP: ${user.city || '[City]'}, ${user.state || '[ST]'} ${user.zipCode || '[ZIP]'}
SSN Last 4: ${user.ssnLast4 || 'XXXX'}

ACCOUNT BEING DISPUTED:
Creditor/Company Name: ${negativeItem.creditorName}
${negativeItem.originalCreditor ? `Original Creditor: ${negativeItem.originalCreditor}` : ''}
Account Number: ${negativeItem.accountNumber || negativeItem.accountNumberMasked || 'Unknown'}
Account Type: ${negativeItem.accountType}
Reported Balance: ${negativeItem.balance ? `$${parseFloat(negativeItem.balance).toLocaleString()}` : 'Unknown'}
${negativeItem.originalBalance ? `Original Balance: $${parseFloat(negativeItem.originalBalance).toLocaleString()}` : ''}
Account Status: ${negativeItem.accountStatus || 'Unknown'}
${negativeItem.dateOfFirstDelinquency ? `Date of First Delinquency: ${new Date(negativeItem.dateOfFirstDelinquency).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}
${negativeItem.dateOpened ? `Date Opened: ${new Date(negativeItem.dateOpened).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}

BUREAUS REPORTING THIS ITEM:
${negativeItem.onEquifax ? '✓ Equifax' : '✗ Equifax'}
${negativeItem.onExperian ? '✓ Experian' : '✗ Experian'}
${negativeItem.onTransunion ? '✓ TransUnion' : '✗ TransUnion'}
`;

  // Add previous dispute history if available
  if (previousDisputes && previousDisputes.length > 0) {
    prompt += `\nPREVIOUS DISPUTE HISTORY:\n`;
    previousDisputes.forEach((dispute, index) => {
      prompt += `- Dispute ${index + 1} (${dispute.round ? `Round ${dispute.round}` : 'Unknown round'}): `;
      prompt += `Sent ${dispute.mailedAt ? new Date(dispute.mailedAt).toLocaleDateString() : 'Unknown date'}`;
      if (dispute.responseType) {
        prompt += ` - Response: ${dispute.responseType}`;
      }
      prompt += '\n';
    });
  }

  // Add custom instructions if provided
  if (customInstructions) {
    prompt += `\nADDITIONAL CONTEXT FROM USER:\n${customInstructions}\n`;
  }

  // Add specific instructions based on letter type and round
  prompt += `\n${getLetterTypeInstructions(letterType, round, target)}`;

  prompt += `\n\nGenerate the complete letter now. Do not include any explanations or metadata - just the letter itself, ready to print and mail.`;

  return prompt;
}

/**
 * Get specific instructions based on letter type
 */
function getLetterTypeInstructions(letterType, round, target) {
  const instructions = {
    INITIAL_DISPUTE: `
LETTER REQUIREMENTS FOR INITIAL DISPUTE (Round 1):
- Open with clear statement that you are disputing this account
- State that you do not recognize or acknowledge this debt
- Request investigation under FCRA Section 611
- Demand verification of: original creditor, amount, date of default, and proof of agreement
- Request deletion if they cannot verify within 30 days
- Be firm but not aggressive - this is your first contact`,

    METHOD_OF_VERIFICATION: `
LETTER REQUIREMENTS FOR METHOD OF VERIFICATION (Round 2):
- Reference your previous dispute and their "verified" response
- Cite FCRA Section 611(a)(6)(B)(iii) requiring description of verification procedure
- Demand to know WHO they contacted, WHAT documents they reviewed, and HOW they verified
- Point out that simply stating "verified" does not meet legal requirements
- Request the name and contact info of the person who verified
- Set a 15-day deadline for response
- State that failure to provide MOV is itself an FCRA violation`,

    PROCEDURAL_VIOLATION: `
LETTER REQUIREMENTS FOR PROCEDURAL VIOLATION (Round 3):
- Take a more formal, legal tone
- List specific FCRA violations with statute citations
- Reference the timeline of your previous disputes
- Document their failure to conduct reasonable investigation
- Mention your intent to file complaints with CFPB and FTC
- Reference potential statutory damages under FCRA
- Demand immediate deletion as remedy for violations`,

    LEGAL_ESCALATION: `
LETTER REQUIREMENTS FOR LEGAL ESCALATION (Round 4):
- Use formal legal letter format
- State this is a FINAL DEMAND before legal action
- Cite willful non-compliance under 15 U.S.C. § 1681n
- Mention actual damages, statutory damages ($100-$1,000), and punitive damages
- Reference attorney consultation
- Give 10-day deadline
- State you will file lawsuit if not resolved
- Mention you will seek attorney's fees`,

    DEBT_VALIDATION: `
LETTER REQUIREMENTS FOR DEBT VALIDATION:
- Cite FDCPA Section 809(b) - 15 U.S.C. § 1692g
- Request complete validation including:
  * Original signed agreement
  * Complete payment history
  * Chain of title documentation
  * License to collect in your state
- State they must cease collection until validated
- Demand they stop credit reporting until validated
- Note that continued collection without validation violates FDCPA`,

    GOODWILL: `
LETTER REQUIREMENTS FOR GOODWILL REQUEST:
- Use a respectful, appreciative tone
- Acknowledge the late payment was your responsibility
- Explain the circumstances briefly (job loss, medical issue, etc.)
- Highlight your positive payment history before/after the incident
- Explain how this affects your credit goals (home purchase, etc.)
- Ask them to consider removing as a gesture of goodwill
- Express continued loyalty to the company`,

    IDENTITY_THEFT: `
LETTER REQUIREMENTS FOR IDENTITY THEFT DISPUTE:
- State clearly you are a victim of identity theft
- Reference FCRA Section 605B for fraud blocks
- Include reference to your FTC Identity Theft Report
- Demand immediate blocking within 4 business days
- Request they notify the furnisher
- Include that you've filed a police report
- Demand written confirmation of the block`,
  };

  return instructions[letterType] || instructions.INITIAL_DISPUTE;
}

/**
 * Parse the letter response from Claude
 */
function parseLetterResponse(content) {
  // Claude should return just the letter, but let's clean it up just in case
  let letter = content.trim();
  
  // Remove any markdown code blocks if present
  letter = letter.replace(/```[\s\S]*?```/g, '');
  letter = letter.replace(/```/g, '');
  
  // Remove any XML-like tags that might have slipped through
  letter = letter.replace(/<[^>]+>/g, '');
  
  // Clean up extra whitespace
  letter = letter.replace(/\n{3,}/g, '\n\n');
  
  return {
    letter: letter.trim(),
    metadata: {
      generatedAt: new Date().toISOString(),
      wordCount: letter.split(/\s+/).length,
      characterCount: letter.length,
    },
  };
}

// ===========================================
// CREDIT REPORT ANALYSIS
// ===========================================

/**
 * Analyze parsed credit report data and recommend disputes
 */
async function analyzeNegativeItems(items, userState = null) {
  const client = getClient();

  const systemPrompt = `You are a credit repair expert analyzing negative items on a credit report.
For each item, provide:
1. Whether to dispute (DISPUTE_NOW, OPTIONAL, WAIT, DO_NOT_DISPUTE)
2. Brief reason for recommendation
3. Suggested dispute strategy
4. Priority (HIGH, MEDIUM, LOW)

Consider:
- Age of the account and 7-year reporting limit
- Statute of limitations for the user's state
- Type of account (collection, late payment, etc.)
- Amount of debt
- Whether multiple bureaus are reporting

Respond in JSON format.`;

  const userPrompt = `Analyze these negative items and provide dispute recommendations:

${userState ? `User's State: ${userState}` : ''}

ITEMS TO ANALYZE:
${JSON.stringify(items, null, 2)}

Respond with a JSON array where each object has:
{
  "itemId": "the item's id",
  "recommendation": "DISPUTE_NOW|OPTIONAL|WAIT|DO_NOT_DISPUTE",
  "reason": "brief explanation",
  "strategy": "INITIAL_DISPUTE|DEBT_VALIDATION|GOODWILL|etc",
  "priority": "HIGH|MEDIUM|LOW",
  "estimatedSuccessRate": "percentage as string"
}`;

  try {
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0]?.text || '[]';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return [];
  } catch (error) {
    console.error('Analysis error:', error);
    throw new Error('Failed to analyze items');
  }
}

// ===========================================
// TEMPLATE VARIATION
// ===========================================

/**
 * Generate phrase variations to avoid template detection
 */
async function generatePhraseVariations(basePhrase, count = 5) {
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: config.anthropic.model,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Generate ${count} alternative ways to say: "${basePhrase}"

Requirements:
- Keep the same meaning and professional tone
- Vary sentence structure and word choice
- Suitable for formal dispute letters
- Each should be distinctly different

Return only the alternatives, one per line, numbered 1-${count}.`,
        },
      ],
    });

    const content = response.content[0]?.text || '';
    const variations = content
      .split('\n')
      .filter(line => line.match(/^\d+\./))
      .map(line => line.replace(/^\d+\.\s*/, '').trim());

    return variations;
  } catch (error) {
    console.error('Variation generation error:', error);
    return [basePhrase]; // Return original if generation fails
  }
}

module.exports = {
  generateDisputeLetter,
  analyzeNegativeItems,
  generatePhraseVariations,
  getClient,
};
