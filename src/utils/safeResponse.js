// ===========================================
// CREDITHOPPER - SAFE RESPONSE BUILDER
// ===========================================
// Builds safe, consistent API responses
// Philosophy: Never return fabricated data, always explain failures clearly

const { envConfig } = require('../config/environment');

/**
 * Processing status codes
 */
const PROCESSING_STATUS = {
  COMPLETED: 'COMPLETED',
  COMPLETED_PARTIAL: 'COMPLETED_PARTIAL',
  CLASSIFICATION_REJECTED: 'CLASSIFICATION_REJECTED',
  EXTRACTION_FAILED: 'EXTRACTION_FAILED',
  TEXT_EXTRACTION_FAILED: 'TEXT_EXTRACTION_FAILED',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
};

/**
 * Document types
 */
const DOCUMENT_TYPES = {
  CREDIT_REPORT: 'CREDIT_REPORT',
  INVOICE: 'INVOICE',
  BANK_STATEMENT: 'BANK_STATEMENT',
  RESUME: 'RESUME',
  LEGAL_DOCUMENT: 'LEGAL_DOCUMENT',
  MARKETING_MATERIAL: 'MARKETING_MATERIAL',
  UNREADABLE: 'UNREADABLE',
  UNKNOWN: 'UNKNOWN',
};

class SafeResponseBuilder {
  
  /**
   * Create a successful processing response
   */
  static success(classification, extraction, processingId) {
    return {
      success: true,
      status: PROCESSING_STATUS.COMPLETED,
      processingId,
      
      // Classification details
      classification: {
        documentType: DOCUMENT_TYPES.CREDIT_REPORT,
        sourceBureau: classification.detectedBureau,
        confidence: classification.confidence,
        confidenceLevel: classification.confidenceLevel,
        bureauConfidence: classification.bureauConfidence,
        evidenceSnippets: this.sanitizeEvidence(classification.evidenceSnippets),
      },
      
      // Extraction results
      extraction: {
        tradelines: extraction.validTradelines,
        collections: extraction.validCollections,
        inquiries: extraction.validInquiries,
        personalInfo: extraction.validPersonalInfo,
        
        counts: {
          tradelines: extraction.validTradelines.length,
          collections: extraction.validCollections.length,
          inquiries: extraction.validInquiries.length,
          totalNegativeItems: extraction.validCollections.length + 
            extraction.validTradelines.filter(t => 
              ['COLLECTION', 'CHARGE_OFF', 'LATE_PAYMENT', 'REPOSSESSION', 'FORECLOSURE'].includes(t.accountType)
            ).length,
          itemsSkippedDueToLowConfidence: extraction.skippedCount,
        },
      },
      
      // No error
      error: null,
      
      // User messaging
      userMessage: `Successfully analyzed your ${classification.detectedBureau || ''} credit report.`.trim(),
      suggestedAction: null,
      
      // Warnings (if any items were skipped)
      warnings: extraction.warnings || [],
    };
  }

  /**
   * Create a partial success response (some items extracted, some skipped)
   */
  static partialSuccess(classification, extraction, processingId) {
    const response = this.success(classification, extraction, processingId);
    
    response.status = PROCESSING_STATUS.COMPLETED_PARTIAL;
    response.userMessage = 'We extracted most of the data from your credit report, but some items could not be read clearly.';
    
    if (extraction.skippedCount > 0) {
      response.warnings.push({
        field: 'extraction',
        message: `${extraction.skippedCount} item(s) were excluded because they could not be verified`,
        count: extraction.skippedCount,
        severity: 'medium',
      });
    }
    
    return response;
  }

  /**
   * Create a classification failure response (not a credit report)
   */
  static classificationFailed(classification, processingId) {
    return {
      success: false,
      status: PROCESSING_STATUS.CLASSIFICATION_REJECTED,
      processingId,
      
      // Classification details
      classification: {
        documentType: classification.documentType || DOCUMENT_TYPES.UNKNOWN,
        sourceBureau: null,
        confidence: classification.confidence,
        confidenceLevel: classification.confidenceLevel || 'LOW',
        bureauConfidence: 0,
        evidenceSnippets: [],
        
        // Rejection info
        rejection: {
          reason: classification.rejectionReason,
          negativeSignals: classification.negativeSignals?.map(s => ({
            type: s.signal,
            detail: s.detail,
          })) || [],
        },
      },
      
      // NO extraction data - explicitly null
      extraction: null,
      
      // Error info
      error: {
        code: 'NOT_CREDIT_REPORT',
        message: classification.rejectionReason,
        userMessage: this.getUserFriendlyRejectionMessage(classification),
      },
      
      // User messaging
      userMessage: this.getUserFriendlyRejectionMessage(classification),
      suggestedAction: 'Please upload an official credit report PDF from Equifax, Experian, or TransUnion. You can get free reports at annualcreditreport.com.',
      
      warnings: [],
    };
  }

  /**
   * Create an extraction failure response (valid credit report but extraction failed)
   */
  static extractionFailed(classification, extractionError, processingId) {
    return {
      success: false,
      status: PROCESSING_STATUS.EXTRACTION_FAILED,
      processingId,
      
      // Classification passed, so include those details
      classification: {
        documentType: DOCUMENT_TYPES.CREDIT_REPORT,
        sourceBureau: classification.detectedBureau,
        confidence: classification.confidence,
        confidenceLevel: classification.confidenceLevel,
        bureauConfidence: classification.bureauConfidence,
        evidenceSnippets: this.sanitizeEvidence(classification.evidenceSnippets),
      },
      
      // NO extraction data
      extraction: null,
      
      // Error info
      error: {
        code: 'EXTRACTION_FAILED',
        message: extractionError?.message || 'Unable to extract data from this credit report',
        userMessage: 'We verified this is a credit report but had trouble reading some of the data.',
        detail: envConfig.isDevelopment ? extractionError?.stack : undefined,
      },
      
      // User messaging
      userMessage: 'We verified this is a credit report but had trouble reading the data. This may be due to formatting issues or image quality.',
      suggestedAction: 'Try downloading a fresh copy of your credit report or using a text-based PDF instead of a scanned image.',
      
      warnings: [],
    };
  }

  /**
   * Create a text extraction failure response (couldn't read PDF)
   */
  static textExtractionFailed(error, processingId) {
    return {
      success: false,
      status: PROCESSING_STATUS.TEXT_EXTRACTION_FAILED,
      processingId,
      
      classification: {
        documentType: DOCUMENT_TYPES.UNREADABLE,
        sourceBureau: null,
        confidence: 0,
        confidenceLevel: 'LOW',
        bureauConfidence: 0,
        evidenceSnippets: [],
      },
      
      extraction: null,
      
      error: {
        code: 'TEXT_EXTRACTION_FAILED',
        message: error?.message || 'Could not read PDF contents',
        userMessage: 'We could not read the contents of this PDF.',
      },
      
      userMessage: 'We could not read the contents of this PDF. Please ensure the file is not corrupted, password-protected, or a scanned image.',
      suggestedAction: 'Try downloading a new copy of your credit report, or if it\'s a scanned document, try getting a text-based PDF version.',
      
      warnings: [],
    };
  }

  /**
   * Create a validation failure response (extracted data failed validation)
   */
  static validationFailed(classification, validationResult, processingId) {
    // If all items failed validation, treat as extraction failure
    const totalValid = (validationResult.validTradelines?.length || 0) +
                       (validationResult.validCollections?.length || 0) +
                       (validationResult.validInquiries?.length || 0);
    
    if (totalValid === 0 && validationResult.skippedCount > 0) {
      return {
        success: false,
        status: PROCESSING_STATUS.VALIDATION_FAILED,
        processingId,
        
        classification: {
          documentType: DOCUMENT_TYPES.CREDIT_REPORT,
          sourceBureau: classification.detectedBureau,
          confidence: classification.confidence,
          confidenceLevel: classification.confidenceLevel,
          bureauConfidence: classification.bureauConfidence,
          evidenceSnippets: this.sanitizeEvidence(classification.evidenceSnippets),
        },
        
        extraction: null,
        
        error: {
          code: 'VALIDATION_FAILED',
          message: 'All extracted items failed validation',
          userMessage: 'We could not verify the accuracy of the extracted data.',
        },
        
        userMessage: 'We identified this as a credit report but could not reliably extract the account information. The document may have unusual formatting.',
        suggestedAction: 'Try uploading a different format of your credit report, or contact support for assistance.',
        
        warnings: validationResult.warnings || [],
      };
    }
    
    // Some items passed - return partial success
    return this.partialSuccess(classification, validationResult, processingId);
  }

  /**
   * Create a generic error response
   */
  static processingError(error, processingId) {
    return {
      success: false,
      status: PROCESSING_STATUS.PROCESSING_ERROR,
      processingId,
      
      classification: {
        documentType: DOCUMENT_TYPES.UNKNOWN,
        sourceBureau: null,
        confidence: 0,
        confidenceLevel: 'LOW',
        bureauConfidence: 0,
        evidenceSnippets: [],
      },
      
      extraction: null,
      
      error: {
        code: 'PROCESSING_ERROR',
        message: envConfig.isDevelopment ? error?.message : 'An unexpected error occurred',
        userMessage: 'An unexpected error occurred while processing your document.',
        detail: envConfig.isDevelopment ? error?.stack : undefined,
      },
      
      userMessage: 'An unexpected error occurred while processing your document. Please try again.',
      suggestedAction: 'If the problem persists, please contact support.',
      
      warnings: [],
    };
  }

  /**
   * Get user-friendly rejection message based on classification
   */
  static getUserFriendlyRejectionMessage(classification) {
    const typeMessages = {
      [DOCUMENT_TYPES.INVOICE]: 'This appears to be an invoice or bill, not a credit report.',
      [DOCUMENT_TYPES.BANK_STATEMENT]: 'This appears to be a bank statement, not a credit report.',
      [DOCUMENT_TYPES.RESUME]: 'This appears to be a resume or CV, not a credit report.',
      [DOCUMENT_TYPES.LEGAL_DOCUMENT]: 'This appears to be a legal document, not a credit report.',
      [DOCUMENT_TYPES.MARKETING_MATERIAL]: 'This appears to be marketing material, not a credit report.',
      [DOCUMENT_TYPES.UNREADABLE]: 'This document could not be read. It may be a scanned image or corrupted file.',
    };

    if (classification.documentType && typeMessages[classification.documentType]) {
      return typeMessages[classification.documentType];
    }

    if (classification.confidence < 20) {
      return 'This file does not appear to be a credit report.';
    }

    if (classification.confidence < 40) {
      return 'We could not verify this as a valid credit report.';
    }

    return 'This document has some credit report characteristics but could not be verified for reliable processing.';
  }

  /**
   * Sanitize evidence snippets (remove any sensitive data)
   */
  static sanitizeEvidence(snippets) {
    if (!snippets || !Array.isArray(snippets)) return [];
    
    return snippets.map(snippet => ({
      type: snippet.type,
      match: snippet.match?.substring(0, 100),
      snippet: snippet.snippet?.substring(0, 200),
    })).slice(0, 5); // Limit to 5 evidence snippets
  }

  /**
   * Deep sanitize response to remove any mock data markers
   * This is a safety net - should never actually find mock data in production
   */
  static sanitizeResponse(response) {
    if (!response) return response;
    
    const sanitized = JSON.parse(JSON.stringify(response));
    
    // Remove any mock data markers that shouldn't exist
    const removeKeys = ['_isMockData', '_mockWarning', '_mockGeneratedAt'];
    
    function deepRemove(obj) {
      if (!obj || typeof obj !== 'object') return;
      
      if (Array.isArray(obj)) {
        obj.forEach(deepRemove);
        return;
      }
      
      for (const key of removeKeys) {
        delete obj[key];
      }
      
      for (const value of Object.values(obj)) {
        deepRemove(value);
      }
    }
    
    deepRemove(sanitized);
    return sanitized;
  }
}

module.exports = {
  SafeResponseBuilder,
  PROCESSING_STATUS,
  DOCUMENT_TYPES,
};
