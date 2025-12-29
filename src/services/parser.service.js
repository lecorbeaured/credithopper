// ===========================================
// CREDITHOPPER - CREDIT REPORT PARSER
// ===========================================
// Parses credit report text to extract negative items
// Uses regex patterns first, then Claude AI for enhancement

const prisma = require('../config/database');
const pdfService = require('./pdf.service');
const itemsService = require('./items.service');
const reportsService = require('./reports.service');
const fs = require('fs');
const path = require('path');

// ===========================================
// MAIN PARSER
// ===========================================

/**
 * Parse a credit report and extract negative items
 */
async function parseReport(reportId, userId) {
  // Get report
  const report = await prisma.creditReport.findFirst({
    where: { id: reportId, userId },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  try {
    // Update status to processing
    await reportsService.updateParseStatus(reportId, 'PROCESSING');

    // Extract text based on file type
    let extractedText = '';
    const ext = path.extname(report.filePath).toLowerCase();
    
    if (ext === '.pdf') {
      const pdfResult = await pdfService.extractTextFromPDF(report.filePath);
      if (!pdfResult.success) {
        throw new Error('Failed to extract text from PDF');
      }
      extractedText = pdfResult.text;
    } else if (ext === '.html' || ext === '.htm') {
      // Read HTML file and strip tags
      const htmlContent = fs.readFileSync(report.filePath, 'utf8');
      extractedText = stripHtmlTags(htmlContent);
    } else {
      throw new Error('Unsupported file format');
    }

    // Clean the text
    const cleanedText = pdfService.cleanText(extractedText);

    // Validate this looks like a credit report
    if (!isValidCreditReportText(cleanedText)) {
      throw new Error('The uploaded file does not appear to be a valid credit report. Please upload a credit report from Equifax, Experian, or TransUnion.');
    }

    // Store raw text
    await reportsService.storeRawText(reportId, cleanedText);

    // Detect bureau
    const bureau = detectBureau(cleanedText);
    if (bureau) {
      await reportsService.updateBureau(reportId, bureau);
    }

    // Try regex parsing first
    let parsedData;
    switch (bureau) {
      case 'EQUIFAX':
        parsedData = parseEquifaxReport(cleanedText);
        break;
      case 'EXPERIAN':
        parsedData = parseExperianReport(cleanedText);
        break;
      case 'TRANSUNION':
        parsedData = parseTransUnionReport(cleanedText);
        break;
      default:
        parsedData = parseGenericReport(cleanedText);
    }

    // If regex didn't find enough items, use Claude AI
    if (parsedData.negativeItems.length < 2) {
      console.log('Regex parsing found few items, trying Claude AI...');
      try {
        const aiParsedData = await parseWithClaudeAI(cleanedText, bureau);
        if (aiParsedData.negativeItems.length > parsedData.negativeItems.length) {
          parsedData = aiParsedData;
          console.log(`Claude AI found ${aiParsedData.negativeItems.length} items`);
        }
      } catch (aiError) {
        console.error('Claude AI parsing failed, using regex results:', aiError.message);
      }
    }

    // Extract personal info
    const personalInfo = extractPersonalInfo(cleanedText);

    // Create negative items in database
    const createdItems = [];
    for (const item of parsedData.negativeItems) {
      try {
        // Set bureau flags
        const bureauFlags = {
          onEquifax: bureau === 'EQUIFAX',
          onExperian: bureau === 'EXPERIAN',
          onTransunion: bureau === 'TRANSUNION',
        };

        const createdItem = await itemsService.createItem(userId, {
          creditReportId: reportId,
          ...item,
          ...bureauFlags,
        });
        createdItems.push(createdItem);
      } catch (itemError) {
        console.error('Failed to create item:', itemError);
        // Continue with other items
      }
    }

    // Update report with parsed data
    await reportsService.updateParseStatus(reportId, 'COMPLETED', null, {
      bureau,
      personalInfo,
      itemsFound: parsedData.negativeItems.length,
      itemsCreated: createdItems.length,
      reportDate: parsedData.reportDate,
      parseTimestamp: new Date().toISOString(),
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'REPORT_PARSED',
        description: `Parsed credit report: ${createdItems.length} items found`,
        entityType: 'credit_report',
        entityId: reportId,
      },
    });

    return {
      success: true,
      reportId,
      bureau,
      personalInfo,
      itemsFound: parsedData.negativeItems.length,
      itemsCreated: createdItems.length,
      items: createdItems,
    };

  } catch (error) {
    console.error('Report parsing error:', error);
    
    // Update status to failed
    await reportsService.updateParseStatus(reportId, 'FAILED', error.message);
    
    throw error;
  }
}

// ===========================================
// CLAUDE AI PARSING
// ===========================================

/**
 * Validate that text appears to be from a credit report
 */
function isValidCreditReportText(text) {
  const lowerText = text.toLowerCase();
  
  // Must contain at least some credit report indicators
  const creditReportIndicators = [
    'credit report',
    'credit score',
    'credit history',
    'account history',
    'payment history',
    'equifax',
    'experian',
    'transunion',
    'credit bureau',
    'tradeline',
    'credit account',
    'balance',
    'credit limit',
    'payment status',
    'account status',
    'date opened',
    'creditor',
    'collection',
    'charge off',
    'delinquent',
    'past due',
    'inquiries',
    'public records',
  ];
  
  let matchCount = 0;
  for (const indicator of creditReportIndicators) {
    if (lowerText.includes(indicator)) {
      matchCount++;
    }
  }
  
  // Require at least 3 indicators to consider it a credit report
  return matchCount >= 3;
}

/**
 * Use Claude AI to parse credit report text
 */
async function parseWithClaudeAI(text, bureau) {
  const claudeService = require('./claude.service');
  const client = claudeService.getClient();
  
  // First validate this looks like a credit report
  if (!isValidCreditReportText(text)) {
    console.log('Text does not appear to be a valid credit report');
    return {
      negativeItems: [],
      reportDate: null,
      parsedBy: 'validation-failed',
      error: 'Document does not appear to be a credit report',
    };
  }
  
  // Truncate text if too long (Claude has context limits)
  const maxLength = 100000;
  const truncatedText = text.length > maxLength 
    ? text.substring(0, maxLength) + '\n...[truncated]...' 
    : text;

  const systemPrompt = `You are a credit report parser. Your job is to extract ONLY REAL negative items that are ACTUALLY PRESENT in the credit report text provided.

CRITICAL RULES:
1. ONLY extract items that are EXPLICITLY mentioned in the text
2. If you cannot find clear negative items in the text, return an empty array []
3. DO NOT make up, invent, or hallucinate any data
4. DO NOT use example data or placeholder data
5. If the document does not appear to be a credit report, return an empty array []
6. Every field must come directly from the text - if a field is not in the text, use null

A negative item includes:
- Collections accounts
- Charge-offs
- Late payments (30/60/90/120+ days)
- Repossessions
- Foreclosures
- Bankruptcies
- Judgments
- Tax liens
- Any account with derogatory marks

For each REAL negative item found, extract:
- creditorName: The EXACT creditor or collection agency name from the document
- originalCreditor: Original creditor if this is a collection (or null)
- accountNumber: Account number exactly as shown (may be partial/masked) (or null)
- accountType: COLLECTION, CHARGE_OFF, LATE_PAYMENT, REPOSSESSION, FORECLOSURE, BANKRUPTCY, JUDGMENT, TAX_LIEN, MEDICAL, CREDIT_CARD, AUTO_LOAN, PERSONAL_LOAN, STUDENT_LOAN, MORTGAGE, OTHER
- balance: Current balance as a number (or null if not shown)
- originalBalance: Original/high credit amount if available (or null)
- accountStatus: The EXACT status text from the report (or null)
- dateOpened: Date account opened in YYYY-MM-DD format (or null)
- dateOfFirstDelinquency: Date of first delinquency in YYYY-MM-DD format (or null)
- lastReportedDate: Last reported date in YYYY-MM-DD format (or null)

Respond with ONLY a valid JSON array. No explanations, no markdown, no code blocks.
If no negative items are found or this is not a credit report, respond with exactly: []`;

  const userPrompt = `Analyze this document and extract ONLY the negative items that are ACTUALLY present in the text. If this is not a credit report or contains no negative items, return an empty array [].

DOCUMENT TEXT:
${truncatedText}

Remember: Only extract REAL data from the document. Do not invent or hallucinate any information. Return [] if no valid negative items are found.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ],
    });

    const content = response.content[0]?.text || '[]';
    
    // Extract JSON from response
    let jsonStr = content;
    
    // Try to find JSON array in the response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    // Parse JSON
    const items = JSON.parse(jsonStr);
    
    // Validate and clean items
    const validItems = items
      .filter(item => item.creditorName && item.creditorName.length > 1)
      .map(item => ({
        creditorName: String(item.creditorName).substring(0, 100),
        originalCreditor: item.originalCreditor ? String(item.originalCreditor).substring(0, 100) : null,
        accountNumber: item.accountNumber || null,
        accountNumberMasked: item.accountNumber ? maskAccountNumber(item.accountNumber) : null,
        accountType: validateAccountType(item.accountType),
        balance: item.balance ? parseFloat(item.balance) : null,
        originalBalance: item.originalBalance ? parseFloat(item.originalBalance) : null,
        accountStatus: item.accountStatus ? String(item.accountStatus).substring(0, 100) : null,
        dateOpened: parseAIDate(item.dateOpened),
        dateOfFirstDelinquency: parseAIDate(item.dateOfFirstDelinquency),
        lastReportedDate: parseAIDate(item.lastReportedDate),
      }));

    return {
      negativeItems: validItems,
      reportDate: null,
      parsedBy: 'claude-ai',
    };
  } catch (error) {
    console.error('Claude AI parsing error:', error);
    throw new Error('AI parsing failed: ' + error.message);
  }
}

/**
 * Validate account type from AI response
 */
function validateAccountType(type) {
  const validTypes = [
    'COLLECTION', 'CHARGE_OFF', 'LATE_PAYMENT', 'REPOSSESSION', 
    'FORECLOSURE', 'BANKRUPTCY', 'JUDGMENT', 'TAX_LIEN', 'MEDICAL',
    'CREDIT_CARD', 'AUTO_LOAN', 'PERSONAL_LOAN', 'STUDENT_LOAN', 
    'MORTGAGE', 'INQUIRY', 'OTHER'
  ];
  
  const upperType = String(type).toUpperCase().replace(/[^A-Z_]/g, '');
  return validTypes.includes(upperType) ? upperType : 'OTHER';
}

/**
 * Parse date from AI response
 */
function parseAIDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {}
  
  return null;
}

/**
 * Strip HTML tags from content
 */
function stripHtmlTags(html) {
  return html
    // Remove script and style tags with content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// ===========================================
// BUREAU DETECTION
// ===========================================

/**
 * Detect which bureau the report is from
 */
function detectBureau(text) {
  const lowerText = text.toLowerCase();

  // Equifax patterns
  if (
    lowerText.includes('equifax') ||
    lowerText.includes('equifax information services') ||
    lowerText.includes('efx')
  ) {
    return 'EQUIFAX';
  }

  // Experian patterns
  if (
    lowerText.includes('experian') ||
    lowerText.includes('experian information solutions')
  ) {
    return 'EXPERIAN';
  }

  // TransUnion patterns
  if (
    lowerText.includes('transunion') ||
    lowerText.includes('trans union') ||
    lowerText.includes('transunion llc')
  ) {
    return 'TRANSUNION';
  }

  return null;
}

// ===========================================
// PERSONAL INFO EXTRACTION
// ===========================================

/**
 * Extract personal information from report
 */
function extractPersonalInfo(text) {
  const info = {
    name: null,
    address: null,
    ssn: null,
    dob: null,
  };

  // Name patterns
  const namePatterns = [
    /(?:name|consumer)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /^([A-Z][A-Z\s]+)$/m,
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match) {
      info.name = match[1].trim();
      break;
    }
  }

  // SSN patterns (partial - last 4)
  const ssnPatterns = [
    /(?:ssn|social security)[:\s]*(?:xxx-xx-)?(\d{4})/i,
    /xxx-xx-(\d{4})/i,
  ];

  for (const pattern of ssnPatterns) {
    const match = text.match(pattern);
    if (match) {
      info.ssn = match[1];
      break;
    }
  }

  // Address patterns
  const addressPattern = /(\d+\s+[A-Za-z\s]+(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|ct|court|way|circle|cir)[,\s]+[A-Za-z\s]+[,\s]+[A-Z]{2}\s+\d{5}(?:-\d{4})?)/i;
  const addressMatch = text.match(addressPattern);
  if (addressMatch) {
    info.address = addressMatch[1].trim();
  }

  return info;
}

// ===========================================
// BUREAU-SPECIFIC PARSERS
// ===========================================

/**
 * Parse Equifax format report
 */
function parseEquifaxReport(text) {
  const negativeItems = [];
  const sections = pdfService.extractSections(text);

  // Equifax-specific patterns
  const accountPattern = /(?:Account(?:\s+Name)?|Creditor)[:\s]*([^\n]+)\n[\s\S]*?(?:Account(?:\s+Number)?|Acct\s*#)[:\s]*([^\n]+)[\s\S]*?(?:Balance|Amount)[:\s]*\$?([\d,]+)/gi;

  let match;
  while ((match = accountPattern.exec(text)) !== null) {
    const item = parseAccountMatch(match, text);
    if (item && isNegativeItem(item, text)) {
      negativeItems.push(item);
    }
  }

  // Also try to parse collections section specifically
  const collectionsItems = parseCollectionsSection(sections.collections || text);
  for (const item of collectionsItems) {
    if (!negativeItems.some(existing => existing.creditorName === item.creditorName)) {
      negativeItems.push(item);
    }
  }

  return {
    negativeItems,
    reportDate: extractReportDate(text),
  };
}

/**
 * Parse Experian format report
 */
function parseExperianReport(text) {
  const negativeItems = [];
  
  // Experian often uses different formatting
  // Look for "Potentially Negative Items" section
  const negativeSection = extractNegativeSection(text, 'experian');

  const accountBlocks = negativeSection.split(/(?=(?:Account|Creditor)\s*(?:Name|:))/i);

  for (const block of accountBlocks) {
    if (block.trim().length < 20) continue;
    
    const item = parseAccountBlock(block);
    if (item && item.creditorName) {
      negativeItems.push(item);
    }
  }

  return {
    negativeItems,
    reportDate: extractReportDate(text),
  };
}

/**
 * Parse TransUnion format report
 */
function parseTransUnionReport(text) {
  const negativeItems = [];

  // TransUnion specific patterns
  const negativeSection = extractNegativeSection(text, 'transunion');

  const accountBlocks = negativeSection.split(/(?=Creditor|Account Name)/i);

  for (const block of accountBlocks) {
    if (block.trim().length < 20) continue;
    
    const item = parseAccountBlock(block);
    if (item && item.creditorName) {
      negativeItems.push(item);
    }
  }

  return {
    negativeItems,
    reportDate: extractReportDate(text),
  };
}

/**
 * Parse generic/unknown format report
 */
function parseGenericReport(text) {
  const negativeItems = [];

  // Use multiple patterns to catch different formats
  const patterns = [
    // Pattern 1: Account Name followed by details
    /(?:Account|Creditor)(?:\s+Name)?[:\s]*([^\n]+)[\s\S]*?(?:Status|Condition)[:\s]*([^\n]*(?:collection|charge.?off|delinquent|late|negative)[^\n]*)/gi,
    
    // Pattern 2: Collection accounts
    /(?:Collection|Medical)\s+(?:Account|Agency)[:\s]*([^\n]+)[\s\S]*?(?:Balance|Amount)[:\s]*\$?([\d,]+)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const item = parseAccountMatch(match, text);
      if (item && item.creditorName) {
        // Check if we already have this creditor
        if (!negativeItems.some(existing => 
          existing.creditorName.toLowerCase() === item.creditorName.toLowerCase()
        )) {
          negativeItems.push(item);
        }
      }
    }
  }

  // Also scan for common collection agency names
  const collectionAgencies = [
    'portfolio recovery', 'midland credit', 'lvnv funding', 'cavalry',
    'jefferson capital', 'enhanced recovery', 'ic system', 'convergent',
    'credit collection services', 'ccs', 'national credit systems',
  ];

  for (const agency of collectionAgencies) {
    const agencyPattern = new RegExp(`(${agency}[^\\n]*)`, 'gi');
    const agencyMatch = text.match(agencyPattern);
    if (agencyMatch) {
      const contextStart = text.toLowerCase().indexOf(agency.toLowerCase());
      const context = text.substring(contextStart, contextStart + 500);
      
      const item = parseAccountBlock(context);
      if (item && !negativeItems.some(e => e.creditorName === item.creditorName)) {
        item.creditorName = agencyMatch[0].trim();
        item.accountType = 'COLLECTION';
        negativeItems.push(item);
      }
    }
  }

  return {
    negativeItems,
    reportDate: extractReportDate(text),
  };
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Extract negative items section from report
 */
function extractNegativeSection(text, bureau) {
  const lowerText = text.toLowerCase();
  
  const markers = {
    equifax: ['potentially negative', 'negative items', 'adverse accounts'],
    experian: ['potentially negative items', 'negative information', 'accounts with negative information'],
    transunion: ['adverse accounts', 'potentially negative', 'negative items'],
  };

  const bureauMarkers = markers[bureau] || markers.equifax;
  
  for (const marker of bureauMarkers) {
    const index = lowerText.indexOf(marker);
    if (index !== -1) {
      // Get text from this marker to end or next major section
      const endMarkers = ['inquiries', 'public records', 'personal information', 'credit score'];
      let endIndex = text.length;
      
      for (const endMarker of endMarkers) {
        const eIndex = lowerText.indexOf(endMarker, index + marker.length);
        if (eIndex !== -1 && eIndex < endIndex) {
          endIndex = eIndex;
        }
      }
      
      return text.substring(index, endIndex);
    }
  }
  
  return text;
}

/**
 * Parse collections section specifically
 */
function parseCollectionsSection(text) {
  const items = [];
  
  // Split by common collection account indicators
  const blocks = text.split(/(?=(?:Collection|Medical Collection|Unpaid))/i);
  
  for (const block of blocks) {
    if (block.length < 30) continue;
    
    const item = parseAccountBlock(block);
    if (item && item.creditorName) {
      item.accountType = 'COLLECTION';
      items.push(item);
    }
  }
  
  return items;
}

/**
 * Parse an account match into structured data
 */
function parseAccountMatch(match, fullText) {
  const contextStart = Math.max(0, match.index - 100);
  const contextEnd = Math.min(fullText.length, match.index + match[0].length + 500);
  const context = fullText.substring(contextStart, contextEnd);
  
  return parseAccountBlock(context);
}

/**
 * Parse a block of text containing account information
 */
function parseAccountBlock(block) {
  const item = {
    creditorName: null,
    originalCreditor: null,
    accountNumber: null,
    accountNumberMasked: null,
    accountType: 'OTHER',
    balance: null,
    originalBalance: null,
    accountStatus: null,
    paymentStatus: null,
    dateOpened: null,
    dateClosed: null,
    dateOfFirstDelinquency: null,
    lastActivityDate: null,
    lastReportedDate: null,
  };

  // Creditor name
  const creditorPatterns = [
    /(?:Account\s+Name|Creditor(?:\s+Name)?|Company\s+Name)[:\s]*([^\n]+)/i,
    /^([A-Z][A-Z\s&\-\.]+(?:LLC|INC|CORP|CO)?)/m,
  ];
  
  for (const pattern of creditorPatterns) {
    const match = block.match(pattern);
    if (match && match[1].trim().length > 2) {
      item.creditorName = cleanCreditorName(match[1].trim());
      break;
    }
  }

  if (!item.creditorName) return null;

  // Original creditor
  const origCreditorMatch = block.match(/(?:Original\s+Creditor|Orig\.?\s+Creditor)[:\s]*([^\n]+)/i);
  if (origCreditorMatch) {
    item.originalCreditor = cleanCreditorName(origCreditorMatch[1].trim());
  }

  // Account number
  const acctNumPatterns = [
    /(?:Account\s*(?:Number|#|No\.?))[:\s]*([A-Z0-9\-\*X]+)/i,
    /(?:Acct\s*#)[:\s]*([A-Z0-9\-\*X]+)/i,
  ];
  
  for (const pattern of acctNumPatterns) {
    const match = block.match(pattern);
    if (match) {
      item.accountNumber = match[1].trim();
      item.accountNumberMasked = maskAccountNumber(match[1].trim());
      break;
    }
  }

  // Balance
  const balancePatterns = [
    /(?:Balance|Current\s+Balance|Amount\s+Owed)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
    /\$\s*([\d,]+(?:\.\d{2})?)/,
  ];
  
  for (const pattern of balancePatterns) {
    const match = block.match(pattern);
    if (match) {
      item.balance = parseFloat(match[1].replace(/,/g, ''));
      break;
    }
  }

  // Original balance / High credit
  const origBalanceMatch = block.match(/(?:Original\s+(?:Balance|Amount)|High\s+Credit|Credit\s+Limit)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
  if (origBalanceMatch) {
    item.originalBalance = parseFloat(origBalanceMatch[1].replace(/,/g, ''));
  }

  // Account status
  const statusPatterns = [
    /(?:Account\s+Status|Status|Condition)[:\s]*([^\n]+)/i,
    /(?:Payment\s+Status)[:\s]*([^\n]+)/i,
  ];
  
  for (const pattern of statusPatterns) {
    const match = block.match(pattern);
    if (match) {
      item.accountStatus = match[1].trim();
      break;
    }
  }

  // Payment status
  const paymentMatch = block.match(/(?:Payment\s+Status|Pay\s+Status)[:\s]*([^\n]+)/i);
  if (paymentMatch) {
    item.paymentStatus = paymentMatch[1].trim();
  }

  // Determine account type from status/content
  item.accountType = determineAccountType(block, item.accountStatus);

  // Dates
  item.dateOpened = extractDate(block, ['Date Opened', 'Open Date', 'Opened']);
  item.dateClosed = extractDate(block, ['Date Closed', 'Close Date', 'Closed']);
  item.dateOfFirstDelinquency = extractDate(block, ['Date of First Delinquency', 'DOFD', 'First Delinquent', 'Date of 1st Delinquency']);
  item.lastActivityDate = extractDate(block, ['Last Activity', 'Last Active', 'Date of Last Activity']);
  item.lastReportedDate = extractDate(block, ['Last Reported', 'Date Reported', 'Reported']);

  return item;
}

/**
 * Determine account type from text
 */
function determineAccountType(text, status) {
  const lowerText = text.toLowerCase();
  const lowerStatus = (status || '').toLowerCase();

  if (lowerText.includes('collection') || lowerStatus.includes('collection')) {
    if (lowerText.includes('medical')) return 'MEDICAL';
    return 'COLLECTION';
  }
  if (lowerText.includes('charge') && lowerText.includes('off') || lowerStatus.includes('charge')) {
    return 'CHARGE_OFF';
  }
  if (lowerText.includes('late') || lowerStatus.includes('late') || lowerStatus.includes('delinquent')) {
    return 'LATE_PAYMENT';
  }
  if (lowerText.includes('repossess')) {
    return 'REPOSSESSION';
  }
  if (lowerText.includes('foreclos')) {
    return 'FORECLOSURE';
  }
  if (lowerText.includes('bankrupt')) {
    return 'BANKRUPTCY';
  }
  if (lowerText.includes('judgment') || lowerText.includes('civil')) {
    return 'JUDGMENT';
  }
  if (lowerText.includes('tax lien')) {
    return 'TAX_LIEN';
  }
  if (lowerText.includes('inquiry') || lowerText.includes('inquir')) {
    return 'INQUIRY';
  }
  if (lowerText.includes('student loan')) {
    return 'STUDENT_LOAN';
  }
  if (lowerText.includes('credit card') || lowerText.includes('revolving')) {
    return 'CREDIT_CARD';
  }
  if (lowerText.includes('auto') || lowerText.includes('vehicle') || lowerText.includes('car loan')) {
    return 'AUTO_LOAN';
  }
  if (lowerText.includes('mortgage') || lowerText.includes('home loan')) {
    return 'MORTGAGE';
  }
  if (lowerText.includes('personal loan') || lowerText.includes('installment')) {
    return 'PERSONAL_LOAN';
  }

  return 'OTHER';
}

/**
 * Check if item is negative
 */
function isNegativeItem(item, fullText) {
  if (!item) return false;

  // Check status for negative indicators
  const negativeIndicators = [
    'collection', 'charge off', 'charged off', 'delinquent',
    'late', 'past due', 'derogatory', 'negative', 'adverse',
    'unpaid', 'default', 'repossess', 'foreclos', 'bankrupt',
    'judgment', 'lien', 'written off',
  ];

  const status = (item.accountStatus || '').toLowerCase();
  const paymentStatus = (item.paymentStatus || '').toLowerCase();
  
  for (const indicator of negativeIndicators) {
    if (status.includes(indicator) || paymentStatus.includes(indicator)) {
      return true;
    }
  }

  // Check if account type is inherently negative
  const negativeTypes = ['COLLECTION', 'CHARGE_OFF', 'REPOSSESSION', 'FORECLOSURE', 'BANKRUPTCY', 'JUDGMENT', 'TAX_LIEN', 'MEDICAL'];
  if (negativeTypes.includes(item.accountType)) {
    return true;
  }

  return false;
}

/**
 * Extract date from text using multiple patterns
 */
function extractDate(text, labels) {
  for (const label of labels) {
    const patterns = [
      new RegExp(`${label}[:\\s]*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`, 'i'),
      new RegExp(`${label}[:\\s]*(\\d{2,4}[/-]\\d{1,2}[/-]\\d{1,2})`, 'i'),
      new RegExp(`${label}[:\\s]*([A-Z][a-z]{2,8}\\s+\\d{1,2},?\\s+\\d{4})`, 'i'),
      new RegExp(`${label}[:\\s]*(\\d{1,2}\\s+[A-Z][a-z]{2,8}\\s+\\d{4})`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const parsed = parseDate(match[1]);
        if (parsed) return parsed;
      }
    }
  }
  
  return null;
}

/**
 * Parse various date formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Try standard Date parsing first
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try MM/DD/YYYY or MM-DD-YYYY
  const mdyMatch = dateStr.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (mdyMatch) {
    let year = parseInt(mdyMatch[3]);
    if (year < 100) year += year > 50 ? 1900 : 2000;
    date = new Date(year, parseInt(mdyMatch[1]) - 1, parseInt(mdyMatch[2]));
    if (!isNaN(date.getTime())) return date;
  }

  // Try YYYY-MM-DD
  const ymdMatch = dateStr.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymdMatch) {
    date = new Date(parseInt(ymdMatch[1]), parseInt(ymdMatch[2]) - 1, parseInt(ymdMatch[3]));
    if (!isNaN(date.getTime())) return date;
  }

  return null;
}

/**
 * Clean creditor name
 */
function cleanCreditorName(name) {
  return name
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s\-\.\&\']/g, '')
    .trim()
    .substring(0, 100);
}

/**
 * Mask account number
 */
function maskAccountNumber(accountNumber) {
  if (!accountNumber) return null;
  const cleaned = accountNumber.replace(/[^A-Z0-9]/gi, '');
  if (cleaned.length <= 4) return 'XXXX' + cleaned;
  return 'XXXX' + cleaned.slice(-4);
}

/**
 * Extract report date
 */
function extractReportDate(text) {
  const patterns = [
    /(?:Report\s+Date|Date\s+of\s+Report|Generated)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(?:Report\s+Date|Date\s+of\s+Report|Generated)[:\s]*([A-Z][a-z]{2,8}\s+\d{1,2},?\s+\d{4})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseDate(match[1]);
    }
  }

  return null;
}

module.exports = {
  parseReport,
  detectBureau,
  extractPersonalInfo,
  parseEquifaxReport,
  parseExperianReport,
  parseTransUnionReport,
  parseGenericReport,
  parseAccountBlock,
  determineAccountType,
  extractDate,
  parseDate,
};
