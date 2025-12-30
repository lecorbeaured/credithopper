// ===========================================
// CREDITHOPPER - EXTRACTION VALIDATOR
// ===========================================
// Validates extracted data and detects hallucinations
// Philosophy: Only show data we're confident is real

// Valid account types
const VALID_ACCOUNT_TYPES = [
  'COLLECTION', 'CHARGE_OFF', 'LATE_PAYMENT', 'REPOSSESSION',
  'FORECLOSURE', 'BANKRUPTCY', 'JUDGMENT', 'TAX_LIEN', 'MEDICAL',
  'CREDIT_CARD', 'AUTO_LOAN', 'PERSONAL_LOAN', 'STUDENT_LOAN',
  'MORTGAGE', 'REVOLVING', 'INSTALLMENT', 'INQUIRY', 'OTHER',
];

// Validation rules for each item type
const VALIDATION_RULES = {
  tradeline: {
    required: ['creditorName'],
    validators: {
      creditorName: (v) => typeof v === 'string' && v.length >= 2 && v.length <= 150,
      accountNumber: (v) => !v || (typeof v === 'string' && v.length >= 2),
      balance: (v) => v === null || v === undefined || (typeof v === 'number' && v >= 0 && v <= 10000000),
      accountType: (v) => !v || VALID_ACCOUNT_TYPES.includes(v),
    },
    confidenceFactors: {
      hasAccountNumber: 15,
      hasBalance: 10,
      hasDateOpened: 10,
      hasAccountStatus: 10,
      hasPaymentHistory: 15,
      creditorNameLooksReal: 20,
      balanceIsReasonable: 10,
      datesAreValid: 10,
    },
  },
  
  collection: {
    required: ['creditorName'],
    validators: {
      creditorName: (v) => typeof v === 'string' && v.length >= 2 && v.length <= 150,
      balance: (v) => v === null || v === undefined || (typeof v === 'number' && v >= 0 && v <= 10000000),
      originalCreditor: (v) => !v || (typeof v === 'string' && v.length >= 2),
    },
    confidenceFactors: {
      hasBalance: 20,
      hasOriginalCreditor: 15,
      hasDateOpened: 10,
      hasAccountNumber: 10,
      creditorNameLooksReal: 25,
      balanceIsReasonable: 10,
      isKnownCollectionAgency: 10,
    },
  },
  
  inquiry: {
    required: ['creditorName'],
    validators: {
      creditorName: (v) => typeof v === 'string' && v.length >= 2,
      inquiryDate: (v) => !v || (v instanceof Date && !isNaN(v)),
      inquiryType: (v) => !v || ['HARD', 'SOFT'].includes(v),
    },
    confidenceFactors: {
      hasInquiryDate: 20,
      hasInquiryType: 10,
      dateIsRecent: 10,
      creditorNameLooksReal: 25,
    },
  },
};

// ===========================================
// HALLUCINATION DETECTOR
// ===========================================

class HallucinationDetector {
  constructor() {
    // Known fake/example data patterns
    this.suspiciousCreditorPatterns = [
      /^abc\s/i,
      /^xyz\s/i,
      /^test\s/i,
      /^sample\s/i,
      /^example\s/i,
      /^fake\s/i,
      /^mock\s/i,
      /^dummy/i,
      /^placeholder/i,
      /lorem\s+ipsum/i,
      /^company\s*(name)?$/i,
      /^creditor\s*(name)?$/i,
      /^bank\s*(name)?$/i,
      /^collection\s*(agency)?$/i,
      /^your\s/i,
      /^the\s+company/i,
      /^\[.*\]$/,  // Bracketed placeholders like [Company Name]
      /^<.*>$/,    // Angle bracket placeholders
    ];

    this.suspiciousAccountPatterns = [
      /^[x]+$/i,           // All X's
      /^0+$/,              // All zeros
      /^1234/,             // Sequential
      /^xxxx1234$/i,       // Common example
      /^[a-z]+$/i,         // All letters (no numbers)
      /^\*+$/,             // All asterisks
    ];

    // Common example amounts (often used in tutorials/examples)
    this.suspiciousAmounts = new Set([
      1234.56,
      1234.00,
      1000.00,
      1500.00,
      2000.00,
      5000.00,
      10000.00,
      100.00,
      500.00,
    ]);

    // Known collection agencies (for positive validation)
    this.knownCollectionAgencies = new Set([
      'portfolio recovery',
      'portfolio recovery associates',
      'midland credit',
      'midland credit management',
      'midland funding',
      'lvnv funding',
      'cavalry spv',
      'cavalry portfolio',
      'jefferson capital',
      'jefferson capital systems',
      'enhanced recovery',
      'enhanced recovery company',
      'ic system',
      'convergent',
      'convergent outsourcing',
      'credit collection services',
      'national credit systems',
      'transworld systems',
      'diversified consultants',
      'allied interstate',
      'apria healthcare',
      'receivables performance',
      'first premier',
      'cach llc',
      'radius global',
      'nationwide credit',
      'iqor',
      'client services',
    ]);

    // Known legitimate creditors
    this.knownCreditors = new Set([
      'chase', 'bank of america', 'wells fargo', 'citibank', 'capital one',
      'discover', 'american express', 'amex', 'synchrony', 'barclays',
      'us bank', 'pnc', 'td bank', 'regions', 'fifth third',
      'navy federal', 'usaa', 'pentagon federal', 'penfed',
      'ally', 'toyota financial', 'honda financial', 'ford credit',
      'verizon', 'at&t', 'att', 't-mobile', 'sprint', 'comcast', 'xfinity',
      'student loan', 'navient', 'nelnet', 'great lakes', 'fedloan',
      'sallie mae', 'mohela',
    ]);
  }

  /**
   * Analyze an extracted item for signs of hallucination
   */
  analyze(item, itemType) {
    const analysis = {
      isLikelyHallucinated: false,
      confidenceReduction: 0,
      suspiciousFields: [],
      reasons: [],
      positiveSignals: [],
    };

    if (!item) {
      analysis.isLikelyHallucinated = true;
      analysis.reasons.push('Item is null or undefined');
      return analysis;
    }

    // Check creditor name
    if (item.creditorName) {
      const nameAnalysis = this.analyzeCreditorName(item.creditorName, itemType);
      if (nameAnalysis.suspicious) {
        analysis.suspiciousFields.push('creditorName');
        analysis.reasons.push(nameAnalysis.reason);
        analysis.confidenceReduction += nameAnalysis.reduction;
      }
      if (nameAnalysis.positive) {
        analysis.positiveSignals.push(nameAnalysis.positive);
      }
    }

    // Check account number
    if (item.accountNumber) {
      const acctAnalysis = this.analyzeAccountNumber(item.accountNumber);
      if (acctAnalysis.suspicious) {
        analysis.suspiciousFields.push('accountNumber');
        analysis.reasons.push(acctAnalysis.reason);
        analysis.confidenceReduction += acctAnalysis.reduction;
      }
    }

    // Check balance
    if (item.balance !== null && item.balance !== undefined) {
      const balanceAnalysis = this.analyzeBalance(item.balance, item.creditorName);
      if (balanceAnalysis.suspicious) {
        analysis.suspiciousFields.push('balance');
        analysis.reasons.push(balanceAnalysis.reason);
        analysis.confidenceReduction += balanceAnalysis.reduction;
      }
    }

    // Check dates for impossible values
    const dateFields = ['dateOpened', 'lastReportedDate', 'dateOfFirstDelinquency', 'inquiryDate'];
    for (const field of dateFields) {
      if (item[field]) {
        const dateAnalysis = this.analyzeDate(item[field], field);
        if (dateAnalysis.suspicious) {
          analysis.suspiciousFields.push(field);
          analysis.reasons.push(dateAnalysis.reason);
          analysis.confidenceReduction += dateAnalysis.reduction;
        }
      }
    }

    // Cross-field consistency checks
    const consistencyAnalysis = this.checkCrossFieldConsistency(item, itemType);
    if (consistencyAnalysis.suspicious) {
      analysis.reasons.push(...consistencyAnalysis.reasons);
      analysis.confidenceReduction += consistencyAnalysis.reduction;
    }

    // Determine if likely hallucinated
    analysis.isLikelyHallucinated = 
      analysis.confidenceReduction >= 40 || 
      analysis.suspiciousFields.length >= 3 ||
      (analysis.suspiciousFields.includes('creditorName') && analysis.confidenceReduction >= 25);

    return analysis;
  }

  analyzeCreditorName(name, itemType) {
    if (!name || typeof name !== 'string') {
      return { suspicious: true, reason: 'Creditor name is empty or invalid', reduction: 50 };
    }

    const lowerName = name.toLowerCase().trim();
    
    // Check against suspicious patterns
    for (const pattern of this.suspiciousCreditorPatterns) {
      if (pattern.test(name)) {
        return {
          suspicious: true,
          reason: `Creditor name "${name}" matches suspicious/example pattern`,
          reduction: 35,
        };
      }
    }

    // Check for unrealistic name characteristics
    if (lowerName.length < 2) {
      return {
        suspicious: true,
        reason: 'Creditor name is too short',
        reduction: 30,
      };
    }

    if (lowerName.length > 100) {
      return {
        suspicious: true,
        reason: 'Creditor name is unrealistically long',
        reduction: 20,
      };
    }

    if (!/[a-z]/i.test(name)) {
      return {
        suspicious: true,
        reason: 'Creditor name contains no letters',
        reduction: 35,
      };
    }

    // Check if it's all caps single word that's too generic
    if (/^[A-Z]+$/.test(name) && name.length <= 4 && !['USAA', 'AMEX', 'HSBC', 'AT&T'].includes(name)) {
      return {
        suspicious: true,
        reason: 'Creditor name appears to be a generic abbreviation',
        reduction: 15,
      };
    }

    // Positive check: Is it a known collection agency or creditor?
    const isKnownCollection = Array.from(this.knownCollectionAgencies).some(
      agency => lowerName.includes(agency)
    );
    const isKnownCreditor = Array.from(this.knownCreditors).some(
      creditor => lowerName.includes(creditor)
    );

    if (isKnownCollection || isKnownCreditor) {
      return { 
        suspicious: false, 
        positive: `Known ${isKnownCollection ? 'collection agency' : 'creditor'}: ${name}`,
      };
    }

    return { suspicious: false };
  }

  analyzeAccountNumber(accountNumber) {
    if (!accountNumber) return { suspicious: false };

    for (const pattern of this.suspiciousAccountPatterns) {
      if (pattern.test(accountNumber)) {
        return {
          suspicious: true,
          reason: `Account number "${accountNumber}" matches example/placeholder pattern`,
          reduction: 20,
        };
      }
    }

    return { suspicious: false };
  }

  analyzeBalance(balance, creditorName) {
    // Check for common example amounts (only suspicious if creditor name also looks fake)
    if (this.suspiciousAmounts.has(balance)) {
      const lowerName = (creditorName || '').toLowerCase();
      const nameIsSuspicious = this.suspiciousCreditorPatterns.some(p => p.test(creditorName || ''));
      
      if (nameIsSuspicious) {
        return {
          suspicious: true,
          reason: `Balance $${balance} combined with suspicious creditor name`,
          reduction: 20,
        };
      }
    }

    // Check for unrealistic values
    if (balance > 5000000) {
      return {
        suspicious: true,
        reason: `Balance $${balance.toLocaleString()} exceeds realistic maximum`,
        reduction: 30,
      };
    }

    if (balance < 0) {
      return {
        suspicious: true,
        reason: 'Balance is negative',
        reduction: 25,
      };
    }

    return { suspicious: false };
  }

  analyzeDate(date, fieldName) {
    // Parse date if it's a string
    let dateObj = date;
    if (typeof date === 'string') {
      dateObj = new Date(date);
    }

    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
      return {
        suspicious: true,
        reason: `${fieldName} is not a valid date`,
        reduction: 15,
      };
    }

    const now = new Date();
    const minDate = new Date('1970-01-01');
    const reasonableMinDate = new Date('1980-01-01');

    // Future dates are always suspicious
    if (dateObj > now) {
      return {
        suspicious: true,
        reason: `${fieldName} is in the future (${dateObj.toISOString().split('T')[0]})`,
        reduction: 30,
      };
    }

    // Very old dates are suspicious
    if (dateObj < minDate) {
      return {
        suspicious: true,
        reason: `${fieldName} is before 1970, which is unrealistic`,
        reduction: 25,
      };
    }

    // Dates before 1980 are somewhat suspicious for credit accounts
    if (dateObj < reasonableMinDate) {
      return {
        suspicious: true,
        reason: `${fieldName} is very old (${dateObj.toISOString().split('T')[0]})`,
        reduction: 10,
      };
    }

    return { suspicious: false };
  }

  checkCrossFieldConsistency(item, itemType) {
    const issues = [];
    let reduction = 0;

    // Date opened should be before last reported date
    if (item.dateOpened && item.lastReportedDate) {
      const opened = new Date(item.dateOpened);
      const lastReported = new Date(item.lastReportedDate);
      
      if (opened > lastReported) {
        issues.push('Date opened is after last reported date');
        reduction += 15;
      }
    }

    // Date of first delinquency should be after date opened
    if (item.dateOpened && item.dateOfFirstDelinquency) {
      const opened = new Date(item.dateOpened);
      const delinquent = new Date(item.dateOfFirstDelinquency);
      
      if (delinquent < opened) {
        issues.push('Date of first delinquency is before date opened');
        reduction += 15;
      }
    }

    // For collections, original balance should typically be >= current balance
    // (though interest can increase it, so only flag extreme cases)
    if (itemType === 'collection' && item.originalBalance && item.balance) {
      if (item.balance > item.originalBalance * 5) {
        issues.push('Current balance is more than 5x the original balance');
        reduction += 10;
      }
    }

    return {
      suspicious: issues.length > 0,
      reasons: issues,
      reduction,
    };
  }
}

// ===========================================
// EXTRACTION VALIDATOR
// ===========================================

class ExtractionValidator {
  constructor(options = {}) {
    this.hallucinationDetector = new HallucinationDetector();
    this.minimumConfidenceThreshold = options.minimumConfidenceThreshold || 40;
  }

  /**
   * Validate all extracted items and return only valid ones
   */
  validateAll(extraction) {
    const result = {
      validTradelines: [],
      validCollections: [],
      validInquiries: [],
      validPersonalInfo: null,
      
      invalidItems: [],
      skippedCount: 0,
      warnings: [],
    };

    // Validate tradelines
    for (const item of extraction.tradelines || []) {
      const validation = this.validateItem(item, 'tradeline');
      if (validation.isValid) {
        result.validTradelines.push({
          ...validation.cleanedItem,
          _confidence: validation.confidence,
          _validationNotes: validation.notes,
        });
      } else {
        result.invalidItems.push({
          type: 'tradeline',
          item: this.sanitizeForLogging(item),
          reason: validation.reason,
          confidence: validation.confidence,
        });
        result.skippedCount++;
      }
    }

    // Validate collections
    for (const item of extraction.collections || []) {
      const validation = this.validateItem(item, 'collection');
      if (validation.isValid) {
        result.validCollections.push({
          ...validation.cleanedItem,
          _confidence: validation.confidence,
          _validationNotes: validation.notes,
        });
      } else {
        result.invalidItems.push({
          type: 'collection',
          item: this.sanitizeForLogging(item),
          reason: validation.reason,
          confidence: validation.confidence,
        });
        result.skippedCount++;
      }
    }

    // Validate inquiries
    for (const item of extraction.inquiries || []) {
      const validation = this.validateItem(item, 'inquiry');
      if (validation.isValid) {
        result.validInquiries.push({
          ...validation.cleanedItem,
          _confidence: validation.confidence,
        });
      } else {
        result.invalidItems.push({
          type: 'inquiry',
          item: this.sanitizeForLogging(item),
          reason: validation.reason,
        });
        result.skippedCount++;
      }
    }

    // Validate personal info (if present)
    if (extraction.personalInfo) {
      result.validPersonalInfo = this.validatePersonalInfo(extraction.personalInfo);
    }

    // Add warnings if many items were skipped
    if (result.skippedCount > 0) {
      const totalItems = (extraction.tradelines?.length || 0) + 
                        (extraction.collections?.length || 0) + 
                        (extraction.inquiries?.length || 0);
      const skipRate = totalItems > 0 ? result.skippedCount / totalItems : 0;
      
      if (skipRate > 0.5) {
        result.warnings.push({
          field: 'extraction',
          message: 'Many items could not be validated and were excluded for accuracy',
          count: result.skippedCount,
          severity: 'high',
        });
      } else if (result.skippedCount > 0) {
        result.warnings.push({
          field: 'extraction',
          message: `${result.skippedCount} item(s) excluded due to low confidence`,
          count: result.skippedCount,
          severity: 'low',
        });
      }
    }

    return result;
  }

  /**
   * Validate a single item
   */
  validateItem(item, itemType) {
    const rules = VALIDATION_RULES[itemType];
    const result = {
      isValid: false,
      confidence: 0,
      reason: null,
      notes: [],
      cleanedItem: null,
    };

    if (!item) {
      result.reason = 'Item is null or undefined';
      return result;
    }

    // Check required fields
    const missingRequired = rules.required.filter(field => {
      const value = item[field];
      return value === null || value === undefined || value === '';
    });
    
    if (missingRequired.length > 0) {
      result.reason = `Missing required field(s): ${missingRequired.join(', ')}`;
      return result;
    }

    // Run field validators
    for (const [field, validator] of Object.entries(rules.validators)) {
      if (item[field] !== undefined && item[field] !== null && !validator(item[field])) {
        result.reason = `Invalid value for ${field}: ${JSON.stringify(item[field])}`;
        return result;
      }
    }

    // Check for hallucination
    const hallucinationAnalysis = this.hallucinationDetector.analyze(item, itemType);
    if (hallucinationAnalysis.isLikelyHallucinated) {
      result.reason = `Likely invalid data: ${hallucinationAnalysis.reasons.join('; ')}`;
      result.confidence = Math.max(0, 50 - hallucinationAnalysis.confidenceReduction);
      return result;
    }

    // Calculate confidence score
    let confidence = 50; // Base confidence
    
    for (const [factor, points] of Object.entries(rules.confidenceFactors)) {
      if (this.checkConfidenceFactor(factor, item, itemType)) {
        confidence += points;
      }
    }
    
    // Apply hallucination-based reduction
    confidence -= hallucinationAnalysis.confidenceReduction;
    
    // Apply bonus for positive signals
    if (hallucinationAnalysis.positiveSignals.length > 0) {
      confidence += 10;
    }
    
    confidence = Math.max(0, Math.min(100, confidence));

    // Check confidence threshold
    if (confidence < this.minimumConfidenceThreshold) {
      result.reason = `Confidence too low (${confidence}%) - minimum is ${this.minimumConfidenceThreshold}%`;
      result.confidence = confidence;
      return result;
    }

    // Item is valid
    result.isValid = true;
    result.confidence = confidence;
    result.cleanedItem = this.cleanItem(item, itemType);
    
    // Add notes about suspicious fields that weren't disqualifying
    if (hallucinationAnalysis.suspiciousFields.length > 0 && !hallucinationAnalysis.isLikelyHallucinated) {
      result.notes.push(`Review recommended for: ${hallucinationAnalysis.suspiciousFields.join(', ')}`);
    }

    // Add positive signals as notes
    if (hallucinationAnalysis.positiveSignals.length > 0) {
      result.notes.push(...hallucinationAnalysis.positiveSignals);
    }

    return result;
  }

  /**
   * Check if a confidence factor applies
   */
  checkConfidenceFactor(factor, item, itemType) {
    const checks = {
      hasAccountNumber: () => !!item.accountNumber && item.accountNumber.length > 2,
      hasBalance: () => item.balance !== null && item.balance !== undefined,
      hasDateOpened: () => !!item.dateOpened,
      hasAccountStatus: () => !!item.accountStatus,
      hasPaymentHistory: () => !!item.paymentHistory,
      hasOriginalCreditor: () => !!item.originalCreditor,
      hasInquiryDate: () => !!item.inquiryDate,
      hasInquiryType: () => !!item.inquiryType,
      creditorNameLooksReal: () => {
        const name = item.creditorName;
        return name && name.length >= 3 && /[a-z]/i.test(name);
      },
      balanceIsReasonable: () => {
        return !item.balance || (item.balance > 0 && item.balance < 1000000);
      },
      datesAreValid: () => this.areDatesValid(item),
      dateIsRecent: () => this.isDateRecent(item.inquiryDate),
      isKnownCollectionAgency: () => {
        const name = (item.creditorName || '').toLowerCase();
        return this.hallucinationDetector.knownCollectionAgencies.has(name) ||
               Array.from(this.hallucinationDetector.knownCollectionAgencies).some(a => name.includes(a));
      },
    };
    
    return checks[factor] ? checks[factor]() : false;
  }

  /**
   * Check if dates in item are valid
   */
  areDatesValid(item) {
    const now = new Date();
    const minDate = new Date('1980-01-01');
    const dates = [item.dateOpened, item.lastReportedDate, item.dateOfFirstDelinquency, item.inquiryDate]
      .filter(d => d)
      .map(d => new Date(d));
    
    return dates.length === 0 || dates.every(d => !isNaN(d.getTime()) && d <= now && d >= minDate);
  }

  /**
   * Check if a date is within the last 2 years
   */
  isDateRecent(date) {
    if (!date) return false;
    const dateObj = new Date(date);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return dateObj >= twoYearsAgo;
  }

  /**
   * Clean an item, keeping only relevant fields
   */
  cleanItem(item, itemType) {
    const allowedFields = {
      tradeline: [
        'creditorName', 'accountNumber', 'accountNumberMasked', 'accountType', 
        'balance', 'creditLimit', 'highCredit', 'accountStatus', 'paymentStatus',
        'dateOpened', 'dateClosed', 'lastReportedDate', 'lastActivityDate',
        'paymentHistory', 'onEquifax', 'onExperian', 'onTransunion',
      ],
      collection: [
        'creditorName', 'originalCreditor', 'accountNumber', 'accountNumberMasked',
        'balance', 'originalBalance', 'accountStatus', 'accountType',
        'dateOpened', 'dateOfFirstDelinquency', 'lastReportedDate', 'lastActivityDate',
        'onEquifax', 'onExperian', 'onTransunion',
      ],
      inquiry: [
        'creditorName', 'inquiryDate', 'inquiryType',
        'onEquifax', 'onExperian', 'onTransunion',
      ],
    };

    const cleaned = {};
    for (const field of allowedFields[itemType] || []) {
      if (item[field] !== undefined) {
        cleaned[field] = item[field];
      }
    }

    return cleaned;
  }

  /**
   * Validate personal info
   */
  validatePersonalInfo(info) {
    if (!info) return null;

    const validated = {};

    // Name - basic validation
    if (info.name && typeof info.name === 'string' && info.name.length >= 2) {
      validated.name = info.name.substring(0, 100);
    }

    // SSN last 4 - must be 4 digits
    if (info.ssnLast4 && /^\d{4}$/.test(info.ssnLast4)) {
      validated.ssnLast4 = info.ssnLast4;
    } else if (info.ssn && typeof info.ssn === 'string') {
      const last4 = info.ssn.replace(/\D/g, '').slice(-4);
      if (last4.length === 4) {
        validated.ssnLast4 = last4;
      }
    }

    // Address
    if (info.address && typeof info.address === 'string' && info.address.length >= 5) {
      validated.address = info.address.substring(0, 200);
    }

    // Date of birth
    if (info.dob || info.dateOfBirth) {
      const dob = new Date(info.dob || info.dateOfBirth);
      if (!isNaN(dob.getTime()) && dob < new Date() && dob > new Date('1900-01-01')) {
        validated.dateOfBirth = dob.toISOString().split('T')[0];
      }
    }

    return Object.keys(validated).length > 0 ? validated : null;
  }

  /**
   * Sanitize item for logging (remove sensitive data)
   */
  sanitizeForLogging(item) {
    if (!item) return null;
    
    const sanitized = { ...item };
    
    // Mask account number
    if (sanitized.accountNumber) {
      const num = String(sanitized.accountNumber);
      sanitized.accountNumber = num.length > 4 ? '****' + num.slice(-4) : '****';
    }
    
    // Remove any SSN data
    delete sanitized.ssn;
    delete sanitized.ssnLast4;
    
    return sanitized;
  }
}

module.exports = {
  ExtractionValidator,
  HallucinationDetector,
  VALIDATION_RULES,
  VALID_ACCOUNT_TYPES,
};
