// ===========================================
// CREDITHOPPER - BUNDLES CONTROLLER
// ===========================================

const bundlesService = require('../services/bundles.service');
const prisma = require('../config/database');
const { success, error, notFound } = require('../utils/response');
const path = require('path');
const fs = require('fs');

/**
 * GET /api/bundles
 * List all available bundles
 */
async function listBundles(req, res, next) {
  try {
    const bundles = bundlesService.getAllBundles();
    
    return success(res, { 
      bundles,
      totalBundles: bundles.length,
      totalLetters: 55,
      totalValue: '$797+'
    }, 'Bundles retrieved');
    
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bundles/:idOrSlug
 * Get a single bundle with letter previews
 */
async function getBundle(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    const bundle = bundlesService.getBundle(idOrSlug);
    
    if (!bundle) {
      return notFound(res, 'Bundle not found');
    }
    
    // Get letter previews (title + first 200 chars)
    const letterPreviews = bundle.letters.map(letterId => {
      const letter = bundlesService.letterTemplates[letterId];
      if (!letter) return null;
      
      return {
        id: letterId,
        title: letter.title,
        preview: letter.content.substring(0, 200) + '...',
        category: letter.category
      };
    }).filter(Boolean);
    
    return success(res, {
      bundle: {
        id: bundle.id,
        name: bundle.name,
        slug: bundle.slug,
        description: bundle.description,
        value: bundle.value,
        category: bundle.category,
        letterCount: bundle.letterCount,
        downloadUrl: `/api/bundles/${bundle.slug}/download`
      },
      letters: letterPreviews
    }, 'Bundle retrieved');
    
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bundles/:idOrSlug/download
 * Download bundle PDF (with optional email capture)
 */
async function downloadBundle(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    const { email } = req.query;
    
    const bundle = bundlesService.getBundle(idOrSlug);
    
    if (!bundle) {
      return notFound(res, 'Bundle not found');
    }
    
    // Check if PDF exists, generate if not
    let pdfPath = bundlesService.getBundlePath(idOrSlug);
    
    if (!pdfPath) {
      // Generate the PDF
      const result = await bundlesService.generateBundlePDF(bundle.id);
      pdfPath = result.filepath;
    }
    
    // If email provided, save as lead
    if (email && email.includes('@')) {
      try {
        await prisma.bundleDownload.create({
          data: {
            email: email.toLowerCase().trim(),
            bundleId: bundle.id,
            bundleName: bundle.name,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
          }
        });
      } catch (dbErr) {
        // Don't fail download if lead capture fails
        console.error('Lead capture error:', dbErr.message);
      }
    }
    
    // Track download (anonymous)
    try {
      await prisma.bundleDownload.create({
        data: {
          bundleId: bundle.id,
          bundleName: bundle.name,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      });
    } catch (dbErr) {
      // Ignore tracking errors
    }
    
    // Send file
    const filename = `CreditHopper-${bundle.slug}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(pdfPath);
    fileStream.pipe(res);
    
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bundles/:idOrSlug/request
 * Request bundle via email (lead capture)
 */
async function requestBundle(req, res, next) {
  try {
    const { idOrSlug } = req.params;
    const { email, firstName } = req.body;
    
    if (!email || !email.includes('@')) {
      return error(res, 'Valid email is required', 400);
    }
    
    const bundle = bundlesService.getBundle(idOrSlug);
    
    if (!bundle) {
      return notFound(res, 'Bundle not found');
    }
    
    // Save lead
    const lead = await prisma.bundleLead.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName?.trim() || null,
        bundleId: bundle.id,
        bundleName: bundle.name,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        source: req.query.source || 'website'
      }
    });
    
    // Generate download URL with token
    const downloadUrl = `/api/bundles/${bundle.slug}/download?email=${encodeURIComponent(email)}`;
    
    return success(res, {
      message: 'Bundle ready for download',
      downloadUrl,
      bundle: {
        name: bundle.name,
        letterCount: bundle.letterCount,
        value: bundle.value
      }
    }, 'Bundle request processed');
    
  } catch (err) {
    // Handle duplicate email gracefully
    if (err.code === 'P2002') {
      const bundle = bundlesService.getBundle(req.params.idOrSlug);
      const downloadUrl = `/api/bundles/${bundle.slug}/download?email=${encodeURIComponent(req.body.email)}`;
      
      return success(res, {
        message: 'Bundle ready for download',
        downloadUrl,
        bundle: {
          name: bundle.name,
          letterCount: bundle.letterCount,
          value: bundle.value
        }
      }, 'Bundle request processed');
    }
    
    next(err);
  }
}

/**
 * GET /api/bundles/letters
 * List all individual letters
 */
async function listLetters(req, res, next) {
  try {
    const { category } = req.query;
    
    let letters = Object.entries(bundlesService.letterTemplates).map(([id, letter]) => ({
      id,
      title: letter.title,
      category: letter.category,
      preview: letter.content.substring(0, 150) + '...'
    }));
    
    if (category) {
      letters = letters.filter(l => l.category === category);
    }
    
    // Group by category
    const byCategory = letters.reduce((acc, letter) => {
      if (!acc[letter.category]) {
        acc[letter.category] = [];
      }
      acc[letter.category].push(letter);
      return acc;
    }, {});
    
    return success(res, {
      letters,
      byCategory,
      totalCount: letters.length
    }, 'Letters retrieved');
    
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/bundles/letters/:id
 * Get full letter content
 */
async function getLetter(req, res, next) {
  try {
    const { id } = req.params;
    const letter = bundlesService.letterTemplates[id];
    
    if (!letter) {
      return notFound(res, 'Letter not found');
    }
    
    return success(res, {
      letter: {
        id,
        title: letter.title,
        category: letter.category,
        content: letter.content
      },
      bureauAddresses: bundlesService.bureauAddresses
    }, 'Letter retrieved');
    
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/bundles/generate-all (admin only)
 * Generate all bundle PDFs
 */
async function generateAllBundles(req, res, next) {
  try {
    // Simple admin check (in production, use proper auth)
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY && adminKey !== 'generate-bundles-2024') {
      return error(res, 'Unauthorized', 401);
    }
    
    const results = await bundlesService.generateAllBundles();
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return success(res, {
      results,
      summary: {
        total: results.length,
        successful,
        failed
      }
    }, `Generated ${successful} bundles`);
    
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listBundles,
  getBundle,
  downloadBundle,
  requestBundle,
  listLetters,
  getLetter,
  generateAllBundles
};
