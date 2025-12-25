// ===========================================
// CREDITHOPPER - FILE UPLOAD MIDDLEWARE
// ===========================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Ensure upload directory exists
const uploadDir = path.resolve(config.upload.directory);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Create subdirectories for organization
const reportsDir = path.join(uploadDir, 'reports');
const documentsDir = path.join(uploadDir, 'documents');

[reportsDir, documentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ===========================================
// STORAGE CONFIGURATION
// ===========================================

/**
 * Create storage engine for a specific subdirectory
 */
function createStorage(subdir) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      // Create user-specific directory
      const userDir = path.join(uploadDir, subdir, req.userId || 'anonymous');
      
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
      }
      
      cb(null, userDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: uuid_timestamp_originalname
      const uniqueId = uuidv4();
      const timestamp = Date.now();
      const ext = path.extname(file.originalname).toLowerCase();
      const safeName = file.originalname
        .replace(/[^a-zA-Z0-9.-]/g, '_')
        .substring(0, 50);
      
      const filename = `${uniqueId}_${timestamp}_${safeName}`;
      cb(null, filename);
    },
  });
}

// ===========================================
// FILE FILTERS
// ===========================================

/**
 * Filter for credit report uploads (PDF only)
 */
function creditReportFilter(req, file, cb) {
  const allowedMimes = ['application/pdf'];
  const allowedExts = ['.pdf'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  
  if (allowedMimes.includes(mime) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed for credit reports'), false);
  }
}

/**
 * Filter for document uploads (PDF, images)
 */
function documentFilter(req, file, cb) {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];
  const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.gif'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  
  if (allowedMimes.includes(mime) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed'), false);
  }
}

// ===========================================
// UPLOAD CONFIGURATIONS
// ===========================================

/**
 * Credit report upload (single PDF) - larger limit for full reports
 */
const uploadCreditReport = multer({
  storage: createStorage('reports'),
  fileFilter: creditReportFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB for credit reports
    files: 1,
  },
});

/**
 * Document upload (single file - PDF or image) - smaller limit
 */
const uploadDocument = multer({
  storage: createStorage('documents'),
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for supporting docs
    files: 1,
  },
});

/**
 * Multiple documents upload (up to 5)
 */
const uploadMultipleDocuments = multer({
  storage: createStorage('documents'),
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB each
    files: 5,
  },
});

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Delete a file from the filesystem
 */
async function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get file info
 */
async function getFileInfo(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      exists: true,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  } catch (error) {
    return { exists: false };
  }
}

/**
 * Create relative path for storage in database
 */
function getRelativePath(absolutePath) {
  return path.relative(uploadDir, absolutePath);
}

/**
 * Get absolute path from relative path
 */
function getAbsolutePath(relativePath) {
  return path.join(uploadDir, relativePath);
}

/**
 * Clean up old files (for scheduled task)
 */
async function cleanupExpiredFiles(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  let deletedCount = 0;
  
  async function processDirectory(dir) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await processDirectory(fullPath);
        
        // Remove empty directories
        const subEntries = await fs.promises.readdir(fullPath);
        if (subEntries.length === 0) {
          await fs.promises.rmdir(fullPath);
        }
      } else {
        const stats = await fs.promises.stat(fullPath);
        if (stats.mtime < cutoffDate) {
          await fs.promises.unlink(fullPath);
          deletedCount++;
        }
      }
    }
  }
  
  await processDirectory(reportsDir);
  
  return deletedCount;
}

// ===========================================
// ERROR HANDLER MIDDLEWARE
// ===========================================

/**
 * Handle multer errors
 */
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      // Determine which limit was exceeded based on the route
      const isReportUpload = req.path.includes('/reports');
      const maxSize = isReportUpload ? '50MB' : '10MB';
      
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${maxSize}`,
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Too many files uploaded',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
      });
    }
    return res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      error: err.message || 'File upload failed',
    });
  }
  
  next();
}

module.exports = {
  uploadCreditReport,
  uploadDocument,
  uploadMultipleDocuments,
  handleUploadError,
  deleteFile,
  getFileInfo,
  getRelativePath,
  getAbsolutePath,
  cleanupExpiredFiles,
  uploadDir,
  reportsDir,
  documentsDir,
};
