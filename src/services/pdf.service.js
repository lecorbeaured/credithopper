// ===========================================
// CREDITHOPPER - PDF PARSER SERVICE
// ===========================================
// Extracts text from PDF credit reports

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

/**
 * Extract text from a PDF file
 */
async function extractTextFromPDF(filePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('PDF file not found');
    }

    // Read file
    const dataBuffer = fs.readFileSync(filePath);

    // Parse PDF
    const options = {
      // Preserve more formatting
      normalizeWhitespace: false,
      disableCombineTextItems: false,
    };

    const data = await pdfParse(dataBuffer, options);

    return {
      success: true,
      text: data.text,
      numPages: data.numpages,
      info: data.info,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Handle specific errors
    if (error.message.includes('Invalid PDF')) {
      throw new Error('Invalid or corrupted PDF file');
    }
    if (error.message.includes('encrypted')) {
      throw new Error('PDF is password protected. Please upload an unprotected PDF.');
    }
    
    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Clean extracted text for better parsing
 */
function cleanText(text) {
  return text
    // Normalize whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive newlines
    .replace(/\n{3,}/g, '\n\n')
    // Remove excessive spaces
    .replace(/ {2,}/g, ' ')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

/**
 * Extract text sections from PDF
 */
function extractSections(text) {
  const sections = {
    personalInfo: '',
    accountHistory: '',
    collections: '',
    publicRecords: '',
    inquiries: '',
    summary: '',
  };

  const lowerText = text.toLowerCase();

  // Try to identify sections based on common headers
  const sectionPatterns = [
    { name: 'personalInfo', patterns: ['personal information', 'consumer information', 'your information'] },
    { name: 'accountHistory', patterns: ['account history', 'credit accounts', 'tradelines', 'accounts in good standing', 'accounts'] },
    { name: 'collections', patterns: ['collections', 'collection accounts', 'accounts in collections'] },
    { name: 'publicRecords', patterns: ['public records', 'public record information'] },
    { name: 'inquiries', patterns: ['inquiries', 'credit inquiries', 'companies that requested your credit'] },
    { name: 'summary', patterns: ['summary', 'credit summary', 'credit score factors'] },
  ];

  // This is a simplified section extraction
  // Real implementation would need more sophisticated parsing
  for (const section of sectionPatterns) {
    for (const pattern of section.patterns) {
      const index = lowerText.indexOf(pattern);
      if (index !== -1) {
        // Extract a chunk of text after this header
        const start = index;
        const end = Math.min(start + 5000, text.length);
        sections[section.name] = text.substring(start, end);
        break;
      }
    }
  }

  return sections;
}

module.exports = {
  extractTextFromPDF,
  cleanText,
  extractSections,
};
