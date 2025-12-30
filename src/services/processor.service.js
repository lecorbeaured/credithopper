// ===========================================
// CREDITHOPPER - CREDIT REPORT PROCESSOR
// ===========================================
// Two-phase processing: Classification -> Extraction
// Philosophy: Never guess, never fabricate, fail safely

const prisma = require('../config/database');
const pdfService = require('./pdf.service');
const { CreditReportClassifier } = require('./classifier.service');
const { ExtractionValidator } = require('./validator.service');
const { SafeResponseBuilder } = require('../utils/safeResponse');
const { envConfig } = require('../config/environment');
const fs = require('fs');
const path = require('path');

// Configuration
const PROCESSOR_CONFIG = {
  classificationThreshold: 60,
  highConfidenceThreshold: 80,
  extractionMinConfidence: 40,
  enableAIExtraction: true,
  minimumTextLength: 500,
  aiModel: 'claude-sonnet-4-20250514',
  aiMaxTokens: 4096,
  maxTextForAI: 100000,
};

class CreditReportProcessor {
  constructor(config = {}) {
    this.config = { ...PROCESSOR_CONFIG, ...config };
    this.classifier = new CreditReportClassifier({
      minimumTextLength: this.config.minimumTextLength,
      confidenceThreshold: this.config.classificationThreshold,
      highConfidenceThreshold: this.config.highConfidenceThreshold,
    });
    this.validator = new ExtractionValidator({
      minimumConfidenceThreshold: this.config.extractionMinConfidence,
    });
  }

  generateProcessingId() {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async processReport(reportId, userId) {
    const processingId = this.generateProcessingId();
    const startTime = Date.now();

    const report = await prisma.creditReport.findFirst({
      where: { id: reportId, userId },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    try {
      await this.updateReportStatus(reportId, 'PROCESSING');

      // TEXT EXTRACTION
      const textResult = await this.extractText(report.filePath);
      
      if (!textResult.success) {
        await this.updateReportStatus(reportId, 'FAILED', textResult.error);
        return SafeResponseBuilder.textExtractionFailed({ message: textResult.error }, processingId);
      }

      // PHASE A: CLASSIFICATION
      const classification = this.classifier.classify(textResult.text);

      console.log(`[${processingId}] Classification: ${classification.isCreditReport ? 'PASS' : 'FAIL'} ` +
                  `(confidence: ${classification.confidence}, bureau: ${classification.detectedBureau || 'unknown'})`);

      if (!classification.isCreditReport) {
        await this.updateReportStatus(reportId, 'REJECTED', classification.rejectionReason);
        await this.logRejection(reportId, userId, classification, processingId);
        return SafeResponseBuilder.classificationFailed(classification, processingId);
      }

      if (classification.detectedBureau) {
        await prisma.creditReport.update({
          where: { id: reportId },
          data: { bureau: classification.detectedBureau },
        });
      }

      // PHASE B: EXTRACTION
      let extraction;
      try {
        extraction = await this.extractData(textResult.text, classification.detectedBureau, processingId);
      } catch (extractionError) {
        console.error(`[${processingId}] Extraction error:`, extractionError);
        await this.updateReportStatus(reportId, 'FAILED', extractionError.message);
        return SafeResponseBuilder.extractionFailed(classification, extractionError, processingId);
      }

      // VALIDATION
      const validatedExtraction = this.validator.validateAll(extraction);

      console.log(`[${processingId}] Validation: ${validatedExtraction.validCollections.length} collections, ` +
                  `${validatedExtraction.validTradelines.length} tradelines, ${validatedExtraction.skippedCount} skipped`);

      const totalValid = validatedExtraction.validTradelines.length +
                        validatedExtraction.validCollections.length +
                        validatedExtraction.validInquiries.length;

      if (totalValid === 0 && validatedExtraction.skippedCount > 0) {
        await this.updateReportStatus(reportId, 'FAILED', 'All extracted items failed validation');
        return SafeResponseBuilder.validationFailed(classification, validatedExtraction, processingId);
      }

      // SAVE VALID ITEMS
      const savedItems = await this.saveExtractedItems(reportId, userId, validatedExtraction, classification.detectedBureau);

      const isPartial = validatedExtraction.skippedCount > 0;
      await this.updateReportStatus(reportId, isPartial ? 'COMPLETED_PARTIAL' : 'COMPLETED', null, {
        itemsFound: totalValid,
        itemsSkipped: validatedExtraction.skippedCount,
        bureau: classification.detectedBureau,
        confidence: classification.confidence,
        processingTimeMs: Date.now() - startTime,
      });

      await this.logActivity(userId, reportId, totalValid, processingId);

      const resultExtraction = { ...validatedExtraction, savedItems };
      
      if (isPartial) {
        return SafeResponseBuilder.partialSuccess(classification, resultExtraction, processingId);
      }
      return SafeResponseBuilder.success(classification, resultExtraction, processingId);

    } catch (error) {
      console.error(`[${processingId}] Processing error:`, error);
      await this.updateReportStatus(reportId, 'FAILED', error.message);
      return SafeResponseBuilder.processingError(error, processingId);
    }
  }

  async extractText(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const ext = path.extname(filePath).toLowerCase();

      if (ext === '.pdf') {
        const result = await pdfService.extractTextFromPDF(filePath);
        if (!result.success) {
          return { success: false, error: result.error || 'Failed to extract text from PDF' };
        }
        return { success: true, text: pdfService.cleanText(result.text) };
      }

      if (ext === '.html' || ext === '.htm') {
        const htmlContent = fs.readFileSync(filePath, 'utf8');
        const text = this.stripHtmlTags(htmlContent);
        return { success: true, text };
      }

      return { success: false, error: 'Unsupported file format' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async extractData(text, bureau, processingId) {
    const extraction = { tradelines: [], collections: [], inquiries: [], personalInfo: null };

    const regexResults = this.parseWithRegex(text, bureau);
    extraction.tradelines = regexResults.tradelines || [];
    extraction.collections = regexResults.collections || [];
    extraction.inquiries = regexResults.inquiries || [];
    extraction.personalInfo = regexResults.personalInfo;

    const regexItemCount = extraction.tradelines.length + extraction.collections.length;
    console.log(`[${processingId}] Regex found ${regexItemCount} items`);

    if (regexItemCount < 2 && this.config.enableAIExtraction) {
      console.log(`[${processingId}] Attempting AI extraction...`);
      try {
        const aiResults = await this.parseWithAI(text, bureau, processingId);
        const aiItemCount = (aiResults.tradelines?.length || 0) + (aiResults.collections?.length || 0);
        console.log(`[${processingId}] AI found ${aiItemCount} items`);

        if (aiItemCount > regexItemCount) {
          extraction.tradelines = aiResults.tradelines || [];
          extraction.collections = aiResults.collections || [];
          extraction.inquiries = aiResults.inquiries || [];
        }
      } catch (aiError) {
        console.error(`[${processingId}] AI extraction failed:`, aiError.message);
      }
    }

    return extraction;
  }

  parseWithRegex(text, bureau) {
    return {
      tradelines: this.parseTradelines(text),
      collections: this.parseCollections(text),
      inquiries: this.parseInquiries(text),
      personalInfo: this.extractPersonalInfo(text),
    };
  }

  async parseWithAI(text, bureau, processingId) {
    const claudeService = require('./claude.service');
    const client = claudeService.getClient();

    const truncatedText = text.length > this.config.maxTextForAI
      ? text.substring(0, this.config.maxTextForAI) + '\n...[truncated]...'
      : text;

    const systemPrompt = `You are a credit report data extractor. Extract ONLY information EXPLICITLY PRESENT in the text.

CRITICAL RULES:
1. ONLY extract data that appears VERBATIM in the text
2. If a field is not clearly stated, use null
3. DO NOT invent or hallucinate any data
4. If no credit accounts found, return empty arrays

Respond with ONLY valid JSON. No explanations.`;

    const userPrompt = `Extract from this ${bureau || ''} credit report. Only include REAL data from the document.

TEXT:
${truncatedText}

Return JSON:
{"tradelines":[],"collections":[],"inquiries":[]}`;

    try {
      const response = await client.messages.create({
        model: this.config.aiModel,
        max_tokens: this.config.aiMaxTokens,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content[0]?.text || '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');

      return {
        tradelines: this.cleanAIItems(parsed.tradelines || [], 'tradeline'),
        collections: this.cleanAIItems(parsed.collections || [], 'collection'),
        inquiries: this.cleanAIItems(parsed.inquiries || [], 'inquiry'),
      };
    } catch (error) {
      throw new Error('AI extraction failed: ' + error.message);
    }
  }

  cleanAIItems(items, type) {
    if (!Array.isArray(items)) return [];
    return items
      .filter(item => item?.creditorName?.length >= 2)
      .map(item => ({
        creditorName: String(item.creditorName).substring(0, 100).trim(),
        accountNumber: item.accountNumber || null,
        accountNumberMasked: item.accountNumber ? this.maskAccountNumber(item.accountNumber) : null,
        accountType: type === 'collection' ? 'COLLECTION' : this.validateAccountType(item.accountType),
        balance: this.parseNumber(item.balance),
        originalBalance: this.parseNumber(item.originalBalance),
        originalCreditor: item.originalCreditor ? String(item.originalCreditor).substring(0, 100) : null,
        accountStatus: item.accountStatus ? String(item.accountStatus).substring(0, 100) : null,
        dateOpened: this.parseDate(item.dateOpened),
        dateOfFirstDelinquency: this.parseDate(item.dateOfFirstDelinquency),
        lastReportedDate: this.parseDate(item.lastReportedDate),
        inquiryDate: this.parseDate(item.inquiryDate),
        inquiryType: ['HARD', 'SOFT'].includes(item.inquiryType) ? item.inquiryType : null,
      }));
  }

  parseCollections(text) {
    const collections = [];
    const lowerText = text.toLowerCase();
    
    // Find collections section
    const sectionStart = Math.max(
      lowerText.indexOf('collection'),
      lowerText.indexOf('potentially negative'),
      lowerText.indexOf('negative items'),
      0
    );
    
    const section = text.substring(sectionStart, Math.min(sectionStart + 10000, text.length));
    const blocks = section.split(/(?=(?:Collection|Account\s+Name|Creditor)[:\s])/i);

    for (const block of blocks) {
      if (block.trim().length < 30) continue;
      const item = this.parseAccountBlock(block);
      if (item?.creditorName) {
        item.accountType = 'COLLECTION';
        if (!collections.some(c => c.creditorName.toLowerCase() === item.creditorName.toLowerCase())) {
          collections.push(item);
        }
      }
    }
    return collections;
  }

  parseTradelines(text) {
    const tradelines = [];
    const blocks = text.split(/(?=(?:Account|Creditor)\s*(?:Name|:))/i);

    for (const block of blocks) {
      if (block.trim().length < 50) continue;
      const item = this.parseAccountBlock(block);
      if (item?.creditorName) {
        const isNegative = /collection|charge.?off|delinquent|late|past\s+due|derogatory/i.test(block);
        if (isNegative) {
          item.accountType = this.determineAccountType(block);
          if (!tradelines.some(t => t.creditorName.toLowerCase() === item.creditorName.toLowerCase())) {
            tradelines.push(item);
          }
        }
      }
    }
    return tradelines;
  }

  parseInquiries(text) {
    const inquiries = [];
    const lowerText = text.toLowerCase();
    const start = lowerText.indexOf('inquir');
    if (start === -1) return [];

    const section = text.substring(start, Math.min(start + 5000, text.length));
    const lines = section.split('\n');

    for (const line of lines) {
      if (line.trim().length < 10) continue;
      const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
      const companyMatch = line.match(/^([A-Z][A-Za-z\s&\-\.]{2,})/);
      
      if (companyMatch?.[1]?.trim().length >= 3) {
        inquiries.push({
          creditorName: companyMatch[1].trim().substring(0, 100),
          inquiryDate: dateMatch ? this.parseDate(dateMatch[1]) : null,
          inquiryType: /hard/i.test(line) ? 'HARD' : null,
        });
      }
    }
    return inquiries.slice(0, 30);
  }

  parseAccountBlock(block) {
    const item = {
      creditorName: null, originalCreditor: null, accountNumber: null, accountNumberMasked: null,
      accountType: 'OTHER', balance: null, originalBalance: null, accountStatus: null,
      dateOpened: null, dateOfFirstDelinquency: null, lastReportedDate: null,
    };

    // Creditor name
    const creditorMatch = block.match(/(?:Account\s+Name|Creditor(?:\s+Name)?|Company)[:\s]*([^\n]+)/i) ||
                         block.match(/^([A-Z][A-Z\s&\-\.]{2,}(?:LLC|INC|CORP|CO|BANK)?)/m);
    if (creditorMatch?.[1]?.trim().length >= 2) {
      item.creditorName = this.cleanCreditorName(creditorMatch[1].trim());
    }
    if (!item.creditorName) return null;

    // Original creditor
    const origMatch = block.match(/(?:Original\s+Creditor)[:\s]*([^\n]+)/i);
    if (origMatch) item.originalCreditor = this.cleanCreditorName(origMatch[1].trim());

    // Account number
    const acctMatch = block.match(/(?:Account\s*#?|Acct\s*#)[:\s]*([A-Z0-9\-\*X]+)/i);
    if (acctMatch) {
      item.accountNumber = acctMatch[1].trim();
      item.accountNumberMasked = this.maskAccountNumber(acctMatch[1].trim());
    }

    // Balance
    const balanceMatch = block.match(/(?:Balance|Amount)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i);
    if (balanceMatch) item.balance = this.parseNumber(balanceMatch[1]);

    // Status
    const statusMatch = block.match(/(?:Status|Condition)[:\s]*([^\n]+)/i);
    if (statusMatch) item.accountStatus = statusMatch[1].trim().substring(0, 100);

    // Dates
    item.dateOpened = this.extractDateField(block, ['Date Opened', 'Opened']);
    item.dateOfFirstDelinquency = this.extractDateField(block, ['First Delinquency', 'DOFD']);
    item.lastReportedDate = this.extractDateField(block, ['Last Reported']);

    return item;
  }

  extractPersonalInfo(text) {
    const info = { name: null, ssnLast4: null };
    const nameMatch = text.match(/(?:Name|Consumer)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameMatch) info.name = nameMatch[1].trim();
    const ssnMatch = text.match(/(?:SSN|Social)[:\s]*(?:XXX-XX-)?(\d{4})/i);
    if (ssnMatch) info.ssnLast4 = ssnMatch[1];
    return info;
  }

  extractDateField(text, labels) {
    for (const label of labels) {
      const match = text.match(new RegExp(`${label}[:\\s]*(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})`, 'i'));
      if (match) return this.parseDate(match[1]);
    }
    return null;
  }

  determineAccountType(text) {
    const lt = text.toLowerCase();
    if (lt.includes('collection')) return 'COLLECTION';
    if (/charge[\s-]?off/.test(lt)) return 'CHARGE_OFF';
    if (lt.includes('late') || lt.includes('delinquent')) return 'LATE_PAYMENT';
    if (lt.includes('repossess')) return 'REPOSSESSION';
    if (lt.includes('medical')) return 'MEDICAL';
    return 'OTHER';
  }

  validateAccountType(type) {
    const valid = ['COLLECTION', 'CHARGE_OFF', 'LATE_PAYMENT', 'REPOSSESSION', 'FORECLOSURE',
      'BANKRUPTCY', 'MEDICAL', 'CREDIT_CARD', 'AUTO_LOAN', 'STUDENT_LOAN', 'MORTGAGE', 'OTHER'];
    const upper = String(type || '').toUpperCase().replace(/[^A-Z_]/g, '');
    return valid.includes(upper) ? upper : 'OTHER';
  }

  cleanCreditorName(name) {
    if (!name) return null;
    // Remove common trailing words that get picked up
    let cleaned = name
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-\.&']/g, '')
      .replace(/\s+(Original|Account|Balance|Status|Date|Number|Type)\s*$/i, '')
      .trim();
    // Limit length
    return cleaned.substring(0, 100) || null;
  }

  maskAccountNumber(num) {
    const cleaned = String(num || '').replace(/[^A-Z0-9]/gi, '');
    return cleaned.length <= 4 ? 'XXXX' + cleaned : 'XXXX' + cleaned.slice(-4);
  }

  parseNumber(value) {
    if (value == null) return null;
    if (typeof value === 'number') return value;
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? null : num;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    try {
      let date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
      const match = String(dateStr).match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
      if (match) {
        let year = parseInt(match[3]);
        if (year < 100) year += year > 50 ? 1900 : 2000;
        date = new Date(year, parseInt(match[1]) - 1, parseInt(match[2]));
        if (!isNaN(date.getTime())) return date;
      }
    } catch (e) {}
    return null;
  }

  stripHtmlTags(html) {
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  async updateReportStatus(reportId, status, errorMessage = null, metadata = null) {
    const data = { parseStatus: status, updatedAt: new Date() };
    if (errorMessage) data.parseError = errorMessage;
    if (metadata) data.parsedData = metadata;
    await prisma.creditReport.update({ where: { id: reportId }, data });
  }

  async logRejection(reportId, userId, classification, processingId) {
    try {
      await prisma.activityLog.create({
        data: {
          userId, action: 'REPORT_REJECTED',
          description: `Document rejected: ${classification.rejectionReason}`,
          entityType: 'credit_report', entityId: reportId,
          metadata: { processingId, confidence: classification.confidence },
        },
      });
    } catch (e) {}
  }

  async saveExtractedItems(reportId, userId, extraction, bureau) {
    const savedItems = [];
    const itemsService = require('./items.service');
    const bureauFlags = {
      onEquifax: bureau === 'EQUIFAX',
      onExperian: bureau === 'EXPERIAN',
      onTransunion: bureau === 'TRANSUNION',
    };

    for (const item of extraction.validCollections) {
      try {
        const saved = await itemsService.createItem(userId, { creditReportId: reportId, ...item, ...bureauFlags });
        savedItems.push(saved);
      } catch (e) { console.error('Failed to save collection:', e.message); }
    }

    for (const item of extraction.validTradelines) {
      if (['COLLECTION', 'CHARGE_OFF', 'LATE_PAYMENT', 'REPOSSESSION', 'FORECLOSURE'].includes(item.accountType)) {
        try {
          const saved = await itemsService.createItem(userId, { creditReportId: reportId, ...item, ...bureauFlags });
          savedItems.push(saved);
        } catch (e) { console.error('Failed to save tradeline:', e.message); }
      }
    }
    return savedItems;
  }

  async logActivity(userId, reportId, itemCount) {
    try {
      await prisma.activityLog.create({
        data: {
          userId, action: 'REPORT_PARSED',
          description: `Parsed credit report: ${itemCount} items found`,
          entityType: 'credit_report', entityId: reportId,
        },
      });
    } catch (e) {}
  }
}

module.exports = { CreditReportProcessor, PROCESSOR_CONFIG };
