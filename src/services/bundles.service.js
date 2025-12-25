// ===========================================
// CREDITHOPPER - PDF BUNDLE SERVICE
// ===========================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { bundles, letterTemplates, bureauAddresses } = require('../data/bundles.data');

// Ensure bundles directory exists
const BUNDLES_DIR = path.join(__dirname, '../../public/bundles');
if (!fs.existsSync(BUNDLES_DIR)) {
  fs.mkdirSync(BUNDLES_DIR, { recursive: true });
}

/**
 * Generate a single letter PDF
 */
function generateLetterPDF(doc, letter, isFirstLetter = false) {
  if (!isFirstLetter) {
    doc.addPage();
  }
  
  // Letter title
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#1a1a2e')
    .text(letter.title, { align: 'center' });
  
  doc.moveDown(0.5);
  
  // Divider line
  doc
    .strokeColor('#06b6d4')
    .lineWidth(2)
    .moveTo(50, doc.y)
    .lineTo(doc.page.width - 50, doc.y)
    .stroke();
  
  doc.moveDown(1);
  
  // Letter content
  doc
    .font('Courier')
    .fontSize(10)
    .fillColor('#333333')
    .text(letter.content, {
      align: 'left',
      lineGap: 4,
      paragraphGap: 8
    });
  
  doc.moveDown(2);
  
  // Instructions box
  const instructionsY = doc.y;
  doc
    .rect(50, instructionsY, doc.page.width - 100, 80)
    .fillAndStroke('#f8fafc', '#e2e8f0');
  
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#475569')
    .text('INSTRUCTIONS:', 60, instructionsY + 10);
  
  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#64748b')
    .text(
      '1. Replace all [bracketed text] with your actual information.\n' +
      '2. Print on white paper and sign in blue or black ink.\n' +
      '3. Send via certified mail with return receipt requested.\n' +
      '4. Keep copies of everything you send.',
      60,
      instructionsY + 25,
      { width: doc.page.width - 120 }
    );
}

/**
 * Generate cover page for a bundle
 */
function generateCoverPage(doc, bundle) {
  // Background gradient effect (simulated with rectangles)
  doc
    .rect(0, 0, doc.page.width, 200)
    .fill('#1a1a2e');
  
  // Logo/Brand
  doc
    .font('Helvetica-Bold')
    .fontSize(28)
    .fillColor('#06b6d4')
    .text('CreditHopper', 50, 50);
  
  doc
    .font('Helvetica')
    .fontSize(12)
    .fillColor('#94a3b8')
    .text('Free Credit Repair Letter Templates', 50, 85);
  
  // Bundle title
  doc
    .font('Helvetica-Bold')
    .fontSize(32)
    .fillColor('#ffffff')
    .text(bundle.name, 50, 130, { width: doc.page.width - 100 });
  
  // Value badge
  doc
    .rect(doc.page.width - 120, 50, 70, 30)
    .fill('#10b981');
  
  doc
    .font('Helvetica-Bold')
    .fontSize(14)
    .fillColor('#ffffff')
    .text(`${bundle.value} VALUE`, doc.page.width - 115, 58);
  
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#ffffff')
    .text('FREE', doc.page.width - 100, 70);
  
  doc.moveDown(4);
  
  // Description
  doc
    .font('Helvetica')
    .fontSize(14)
    .fillColor('#475569')
    .text(bundle.description, 50, 230, { width: doc.page.width - 100 });
  
  doc.moveDown(2);
  
  // What's included
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#1a1a2e')
    .text("What's Included:", 50);
  
  doc.moveDown(0.5);
  
  // Letter list
  bundle.letters.forEach((letterId, index) => {
    const letter = letterTemplates[letterId];
    if (letter) {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#475569')
        .text(`${index + 1}. ${letter.title}`, 60);
    }
  });
  
  doc.moveDown(2);
  
  // How to use section
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#1a1a2e')
    .text('How to Use These Letters:', 50);
  
  doc.moveDown(0.5);
  
  const instructions = [
    'Replace all [bracketed text] with your actual information',
    'Print each letter on white paper',
    'Sign with blue or black ink',
    'Send via certified mail with return receipt requested',
    'Keep copies of everything you send',
    'Wait 30-45 days for responses',
    'Follow up if no response received'
  ];
  
  instructions.forEach((instruction, index) => {
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#475569')
      .text(`${index + 1}. ${instruction}`, 60);
  });
  
  doc.moveDown(2);
  
  // Bureau addresses
  doc
    .font('Helvetica-Bold')
    .fontSize(16)
    .fillColor('#1a1a2e')
    .text('Credit Bureau Addresses:', 50);
  
  doc.moveDown(0.5);
  
  Object.values(bureauAddresses).forEach(bureau => {
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#1a1a2e')
      .text(bureau.name, 60);
    
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#475569')
      .text(`${bureau.address}, ${bureau.city}, ${bureau.state} ${bureau.zip}`, 60);
    
    doc.moveDown(0.3);
  });
  
  // Footer
  const footerY = doc.page.height - 60;
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor('#94a3b8')
    .text(
      'These templates are for educational purposes. CreditHopper is not a law firm and does not provide legal advice.',
      50,
      footerY,
      { width: doc.page.width - 100, align: 'center' }
    );
  
  doc
    .fontSize(10)
    .fillColor('#06b6d4')
    .text('credithopper.io', 50, footerY + 20, { 
      width: doc.page.width - 100, 
      align: 'center',
      link: 'https://credithopper.io'
    });
}

/**
 * Generate a complete bundle PDF
 */
async function generateBundlePDF(bundleId) {
  const bundle = bundles.find(b => b.id === bundleId || b.slug === bundleId);
  
  if (!bundle) {
    throw new Error(`Bundle not found: ${bundleId}`);
  }
  
  const filename = `${bundle.slug}.pdf`;
  const filepath = path.join(BUNDLES_DIR, filename);
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: bundle.name,
        Author: 'CreditHopper',
        Subject: 'Credit Repair Letter Templates',
        Keywords: 'credit repair, dispute letters, debt validation',
        Creator: 'CreditHopper - credithopper.io'
      }
    });
    
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // Cover page
    generateCoverPage(doc, bundle);
    
    // Letter pages
    bundle.letters.forEach((letterId, index) => {
      const letter = letterTemplates[letterId];
      if (letter) {
        generateLetterPDF(doc, letter, false);
      }
    });
    
    // Final page - CTA
    doc.addPage();
    
    doc
      .rect(0, 0, doc.page.width, doc.page.height)
      .fill('#1a1a2e');
    
    doc
      .font('Helvetica-Bold')
      .fontSize(28)
      .fillColor('#ffffff')
      .text('Need Personalized Letters?', 50, 150, { 
        width: doc.page.width - 100, 
        align: 'center' 
      });
    
    doc.moveDown(1);
    
    doc
      .font('Helvetica')
      .fontSize(16)
      .fillColor('#94a3b8')
      .text(
        'Our AI-powered Credit Repair Engine analyzes your specific credit report and generates personalized dispute letters tailored to your situation.',
        50,
        doc.y,
        { width: doc.page.width - 100, align: 'center' }
      );
    
    doc.moveDown(2);
    
    // Features
    const features = [
      '✓ Upload your credit report for instant analysis',
      '✓ AI identifies the best dispute strategies',
      '✓ Personalized letters with your info pre-filled',
      '✓ Track your disputes and wins',
      '✓ 7-day free trial - no credit card required'
    ];
    
    features.forEach(feature => {
      doc
        .font('Helvetica')
        .fontSize(14)
        .fillColor('#10b981')
        .text(feature, 100, doc.y, { width: doc.page.width - 200 });
      doc.moveDown(0.5);
    });
    
    doc.moveDown(2);
    
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor('#06b6d4')
      .text('Start Your Free Trial', 50, doc.y, { 
        width: doc.page.width - 100, 
        align: 'center',
        link: 'https://credithopper.io/register.html'
      });
    
    doc.moveDown(1);
    
    doc
      .font('Helvetica')
      .fontSize(14)
      .fillColor('#ffffff')
      .text('credithopper.io', 50, doc.y, { 
        width: doc.page.width - 100, 
        align: 'center',
        link: 'https://credithopper.io'
      });
    
    doc.end();
    
    stream.on('finish', () => {
      resolve({
        filename,
        filepath,
        bundle
      });
    });
    
    stream.on('error', reject);
  });
}

/**
 * Generate all bundle PDFs
 */
async function generateAllBundles() {
  const results = [];
  
  for (const bundle of bundles) {
    try {
      const result = await generateBundlePDF(bundle.id);
      results.push({
        success: true,
        ...result
      });
      console.log(`✓ Generated: ${bundle.name}`);
    } catch (error) {
      results.push({
        success: false,
        bundleId: bundle.id,
        error: error.message
      });
      console.error(`✗ Failed: ${bundle.name} - ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Get bundle by ID or slug
 */
function getBundle(idOrSlug) {
  return bundles.find(b => b.id === idOrSlug || b.slug === idOrSlug);
}

/**
 * Get all bundles metadata
 */
function getAllBundles() {
  return bundles.map(bundle => ({
    id: bundle.id,
    name: bundle.name,
    slug: bundle.slug,
    description: bundle.description,
    value: bundle.value,
    category: bundle.category,
    letterCount: bundle.letterCount,
    downloadUrl: `/bundles/${bundle.slug}.pdf`
  }));
}

/**
 * Get bundle PDF path
 */
function getBundlePath(idOrSlug) {
  const bundle = getBundle(idOrSlug);
  if (!bundle) return null;
  
  const filepath = path.join(BUNDLES_DIR, `${bundle.slug}.pdf`);
  if (fs.existsSync(filepath)) {
    return filepath;
  }
  
  return null;
}

/**
 * Check if bundle PDF exists
 */
function bundleExists(idOrSlug) {
  return getBundlePath(idOrSlug) !== null;
}

module.exports = {
  generateBundlePDF,
  generateAllBundles,
  getBundle,
  getAllBundles,
  getBundlePath,
  bundleExists,
  bundles,
  letterTemplates,
  bureauAddresses,
  BUNDLES_DIR
};
