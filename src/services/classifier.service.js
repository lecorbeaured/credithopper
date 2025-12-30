// ===========================================
// CREDITHOPPER - DOCUMENT CLASSIFIER
// ===========================================
// Multi-signal confidence-based credit report detection
// Philosophy: Never guess, always provide evidence

// Signal weights for confidence scoring
const SIGNAL_WEIGHTS = {
  // Primary identifiers (high confidence signals)
  BUREAU_HEADER: 25,
  BUREAU_ADDRESS: 15,
  REPORT_NUMBER: 15,
  
  // Structural signals (medium confidence)
  SECTION_HEADERS: 15,
  CREDIT_SCORE_SECTION: 10,
  CONSUMER_INFO_SECTION: 10,
  
  // Content signals (supporting evidence)
  TRADELINE_PATTERNS: 10,
  DATE_PATTERNS: 5,
  FINANCIAL_TERMINOLOGY: 5,
  
  // Negative signals (reduce confidence)
  INVOICE_MARKERS: -30,
  RESUME_MARKERS: -30,
  BANK_STATEMENT_MARKERS: -25,
  LEGAL_DOCUMENT_MARKERS: -20,
  MARKETING_CONTENT: -15,
  INSUFFICIENT_TEXT: -40,
};

// Bureau-specific detection patterns
const BUREAU_SIGNATURES = {
  EQUIFAX: {
    primaryIdentifiers: [
      /equifax\s+information\s+services/i,
      /equifax\s+credit\s+report/i,
      /www\.equifax\.com/i,
      /equifax/i,
    ],
    addressPatterns: [
      /p\.?\s*o\.?\s*box\s+740241.*atlanta.*ga.*30374/i,
      /p\.?\s*o\.?\s*box\s+740256.*atlanta.*ga/i,
      /1550\s+peachtree/i,
    ],
    reportNumberFormat: /confirmation\s*#?\s*:?\s*\d{10,}/i,
    uniqueTerminology: [
      'equifax credit score',
      'beacon score',
      'customer file',
    ],
    sectionHeaders: [
      'accounts in good standing',
      'negative account history',
      'credit inquiries',
      'potentially negative items',
    ],
  },
  
  EXPERIAN: {
    primaryIdentifiers: [
      /experian\s+credit\s+report/i,
      /experian\s+information\s+solutions/i,
      /www\.experian\.com/i,
      /experian/i,
    ],
    addressPatterns: [
      /p\.?\s*o\.?\s*box\s+4500.*allen.*tx.*75013/i,
      /p\.?\s*o\.?\s*box\s+2002.*allen.*tx/i,
      /475\s+anton/i,
    ],
    reportNumberFormat: /report\s+number\s*:?\s*[A-Z0-9]{10,}/i,
    uniqueTerminology: [
      'experian credit score',
      'potentially negative items',
      'credit data updated',
    ],
    sectionHeaders: [
      'potentially negative items',
      'accounts in good standing',
      'requests for your credit history',
      'credit inquiries',
    ],
  },
  
  TRANSUNION: {
    primaryIdentifiers: [
      /transunion\s+credit\s+report/i,
      /transunion\s+llc/i,
      /trans\s*union/i,
      /www\.transunion\.com/i,
      /transunion/i,
    ],
    addressPatterns: [
      /p\.?\s*o\.?\s*box\s+2000.*chester.*pa.*19016/i,
      /p\.?\s*o\.?\s*box\s+1000.*chester.*pa/i,
      /555\s+west\s+adams/i,
    ],
    reportNumberFormat: /file\s+number\s*:?\s*[A-Z0-9]{8,}/i,
    uniqueTerminology: [
      'transunion credit score',
      'vantagescore',
      'trended data',
    ],
    sectionHeaders: [
      'adverse accounts',
      'satisfactory accounts',
      'regular inquiries',
      'account information',
    ],
  },
};

// Negative signal patterns (non-credit documents)
const NEGATIVE_PATTERNS = {
  INVOICE_MARKERS: [
    /invoice\s*(number|#|no\.?)\s*:?/i,
    /bill\s+to\s*:/i,
    /amount\s+due\s*:/i,
    /payment\s+terms\s*:/i,
    /remit\s+(payment\s+)?to\s*:/i,
    /qty\s+description\s+price/i,
    /subtotal/i,
    /total\s+due/i,
  ],
  RESUME_MARKERS: [
    /work\s+experience/i,
    /education\s+(background|history)/i,
    /skills\s*:/i,
    /references\s+(available|upon)/i,
    /objective\s*:/i,
    /career\s+(summary|objective)/i,
    /professional\s+experience/i,
  ],
  BANK_STATEMENT_MARKERS: [
    /beginning\s+balance/i,
    /ending\s+balance/i,
    /account\s+summary/i,
    /transaction\s+history/i,
    /deposits?\s+and\s+withdrawals?/i,
    /available\s+balance/i,
    /statement\s+period/i,
  ],
  LEGAL_DOCUMENT_MARKERS: [
    /plaintiff\s+v\.?\s/i,
    /defendant/i,
    /court\s+of\s+/i,
    /hereby\s+ordered/i,
    /legal\s+notice/i,
    /summons/i,
    /complaint\s+for/i,
  ],
  MARKETING_CONTENT: [
    /limited\s+time\s+offer/i,
    /act\s+now/i,
    /call\s+today/i,
    /special\s+promotion/i,
    /discount\s+code/i,
  ],
};

// Generic credit report patterns
const GENERIC_CREDIT_PATTERNS = {
  CREDIT_SCORE_SECTION: [
    /credit\s+score\s*:?\s*\d{3}/i,
    /fico\s+score/i,
    /vantagescore/i,
    /score\s+factors/i,
    /your\s+score/i,
  ],
  CONSUMER_INFO_SECTION: [
    /social\s+security\s+(number|#)/i,
    /ssn\s*:?\s*[x\d\-\*]+/i,
    /date\s+of\s+birth/i,
    /current\s+address/i,
    /previous\s+address(es)?/i,
    /personal\s+information/i,
  ],
  TRADELINE_PATTERNS: [
    /account\s+type\s*:/i,
    /date\s+opened\s*:/i,
    /credit\s+limit\s*:/i,
    /high\s+credit\s*:/i,
    /payment\s+status/i,
    /account\s+status/i,
    /balance\s*:/i,
    /monthly\s+payment/i,
  ],
  FINANCIAL_TERMINOLOGY: [
    /collection\s+account/i,
    /charge[\s-]?off/i,
    /delinquent/i,
    /past\s+due/i,
    /credit\s+inquir(y|ies)/i,
    /hard\s+inquir(y|ies)/i,
    /tradeline/i,
    /creditor/i,
    /public\s+records?/i,
  ],
};

class CreditReportClassifier {
  constructor(options = {}) {
    this.minimumTextLength = options.minimumTextLength || 500;
    this.confidenceThreshold = options.confidenceThreshold || 60;
    this.highConfidenceThreshold = options.highConfidenceThreshold || 80;
  }

  /**
   * Classify a document and return detailed evidence
   * @param {string} extractedText - Raw text from PDF
   * @returns {ClassificationResult}
   */
  classify(extractedText) {
    const result = {
      isCreditReport: false,
      confidence: 0,
      detectedBureau: null,
      bureauConfidence: 0,
      signals: [],
      negativeSignals: [],
      evidenceSnippets: [],
      rejectionReason: null,
      documentType: 'UNKNOWN',
    };

    // Pre-check: Minimum text requirement
    if (!extractedText || extractedText.length < this.minimumTextLength) {
      result.negativeSignals.push({
        signal: 'INSUFFICIENT_TEXT',
        weight: SIGNAL_WEIGHTS.INSUFFICIENT_TEXT,
        detail: `Text length ${extractedText?.length || 0} below minimum ${this.minimumTextLength}`,
      });
      result.rejectionReason = 'Document contains insufficient readable text. This may be a scanned image or corrupted file.';
      result.documentType = 'UNREADABLE';
      return this.finalizeResult(result);
    }

    const normalizedText = this.normalizeText(extractedText);

    // Check for negative signals first (non-credit documents)
    this.detectNegativeSignals(normalizedText, result);

    // Calculate negative score
    const negativeScore = result.negativeSignals.reduce((sum, s) => sum + s.weight, 0);
    
    // If strong negative signals, may reject early and identify document type
    if (negativeScore <= -40) {
      result.documentType = this.determineDocumentType(result.negativeSignals);
      result.rejectionReason = this.getRejectionMessage(result.documentType);
      return this.finalizeResult(result);
    }

    // Detect bureau-specific signals
    this.detectBureauSignals(normalizedText, extractedText, result);

    // Detect generic credit report signals
    this.detectGenericSignals(normalizedText, result);

    // Calculate final confidence
    return this.finalizeResult(result);
  }

  /**
   * Detect negative signals that indicate non-credit documents
   */
  detectNegativeSignals(text, result) {
    for (const [signalType, patterns] of Object.entries(NEGATIVE_PATTERNS)) {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          result.negativeSignals.push({
            signal: signalType,
            weight: SIGNAL_WEIGHTS[signalType],
            detail: `Found: "${match[0]}"`,
            position: match.index,
          });
          break; // One match per category is enough
        }
      }
    }
  }

  /**
   * Detect bureau-specific signals
   */
  detectBureauSignals(normalizedText, originalText, result) {
    for (const [bureau, signatures] of Object.entries(BUREAU_SIGNATURES)) {
      let bureauScore = 0;
      const bureauEvidence = [];

      // Check primary identifiers
      for (const pattern of signatures.primaryIdentifiers) {
        const match = normalizedText.match(pattern);
        if (match) {
          bureauScore += 30;
          bureauEvidence.push({
            type: 'PRIMARY_IDENTIFIER',
            match: match[0],
            snippet: this.extractSnippet(originalText, match.index),
          });
          break;
        }
      }

      // Check address patterns
      for (const pattern of signatures.addressPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          bureauScore += 20;
          bureauEvidence.push({
            type: 'BUREAU_ADDRESS',
            match: match[0],
            snippet: this.extractSnippet(originalText, match.index),
          });
          break;
        }
      }

      // Check report number format
      const reportMatch = normalizedText.match(signatures.reportNumberFormat);
      if (reportMatch) {
        bureauScore += 15;
        bureauEvidence.push({
          type: 'REPORT_NUMBER',
          match: reportMatch[0],
          snippet: this.extractSnippet(originalText, reportMatch.index),
        });
      }

      // Check section headers
      let headerMatches = 0;
      for (const header of signatures.sectionHeaders) {
        if (normalizedText.includes(header.toLowerCase())) {
          headerMatches++;
        }
      }
      if (headerMatches >= 2) {
        bureauScore += 15;
        bureauEvidence.push({
          type: 'SECTION_HEADERS',
          detail: `Found ${headerMatches} bureau-specific section headers`,
        });
      }

      // Update result if this bureau has highest score
      if (bureauScore > result.bureauConfidence) {
        result.bureauConfidence = bureauScore;
        result.detectedBureau = bureau;
        result.evidenceSnippets = bureauEvidence;
      }
    }

    // Add bureau detection to signals if found
    if (result.detectedBureau) {
      result.signals.push({
        signal: 'BUREAU_DETECTED',
        weight: Math.min(result.bureauConfidence, 40),
        detail: `Detected ${result.detectedBureau} with bureau confidence ${result.bureauConfidence}`,
      });
    }
  }

  /**
   * Detect generic credit report signals
   */
  detectGenericSignals(text, result) {
    for (const [signalType, patterns] of Object.entries(GENERIC_CREDIT_PATTERNS)) {
      let matchCount = 0;
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          matchCount++;
        }
      }
      
      if (matchCount >= 2) {
        const weight = SIGNAL_WEIGHTS[signalType] || 5;
        const adjustedWeight = weight * Math.min(matchCount / 2, 1.5);
        result.signals.push({
          signal: signalType,
          weight: adjustedWeight,
          detail: `Found ${matchCount} matching patterns`,
        });
      }
    }
  }

  /**
   * Finalize the classification result
   */
  finalizeResult(result) {
    // Calculate total confidence
    const positiveScore = result.signals.reduce((sum, s) => sum + s.weight, 0);
    const negativeScore = result.negativeSignals.reduce((sum, s) => sum + s.weight, 0);
    
    result.confidence = Math.max(0, Math.min(100, positiveScore + negativeScore));
    result.isCreditReport = result.confidence >= this.confidenceThreshold;
    
    // Set document type and rejection reason if not a credit report
    if (result.isCreditReport) {
      result.documentType = 'CREDIT_REPORT';
      result.rejectionReason = null;
    } else if (!result.rejectionReason) {
      if (result.confidence < 30) {
        result.rejectionReason = 'Document does not appear to be a credit report. Please upload an official credit report from Equifax, Experian, or TransUnion.';
      } else {
        result.rejectionReason = 'Document has some credit report characteristics but confidence is too low for reliable processing.';
      }
    }

    // Add confidence level indicator
    result.confidenceLevel = result.confidence >= this.highConfidenceThreshold ? 'HIGH' :
                             result.confidence >= this.confidenceThreshold ? 'MEDIUM' : 'LOW';

    return result;
  }

  /**
   * Determine document type from negative signals
   */
  determineDocumentType(negativeSignals) {
    const typeMap = {
      INVOICE_MARKERS: 'INVOICE',
      RESUME_MARKERS: 'RESUME',
      BANK_STATEMENT_MARKERS: 'BANK_STATEMENT',
      LEGAL_DOCUMENT_MARKERS: 'LEGAL_DOCUMENT',
      MARKETING_CONTENT: 'MARKETING_MATERIAL',
    };

    for (const signal of negativeSignals) {
      if (typeMap[signal.signal]) {
        return typeMap[signal.signal];
      }
    }
    return 'UNKNOWN';
  }

  /**
   * Get user-friendly rejection message based on document type
   */
  getRejectionMessage(documentType) {
    const messages = {
      INVOICE: 'This appears to be an invoice or bill, not a credit report.',
      RESUME: 'This appears to be a resume or CV, not a credit report.',
      BANK_STATEMENT: 'This appears to be a bank statement, not a credit report.',
      LEGAL_DOCUMENT: 'This appears to be a legal document, not a credit report.',
      MARKETING_MATERIAL: 'This appears to be marketing material, not a credit report.',
      UNREADABLE: 'Document contains insufficient readable text. This may be a scanned image that needs OCR processing.',
      UNKNOWN: 'This file does not appear to be a credit report.',
    };
    return messages[documentType] || messages.UNKNOWN;
  }

  /**
   * Normalize text for pattern matching
   */
  normalizeText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\n]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Extract snippet of text around a match position
   */
  extractSnippet(text, position, length = 100) {
    if (position === undefined || position === null) return '';
    const start = Math.max(0, position - 30);
    const end = Math.min(text.length, position + length);
    let snippet = text.substring(start, end).trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  }
}

module.exports = {
  CreditReportClassifier,
  SIGNAL_WEIGHTS,
  BUREAU_SIGNATURES,
  NEGATIVE_PATTERNS,
  GENERIC_CREDIT_PATTERNS,
};
