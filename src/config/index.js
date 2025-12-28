// ===========================================
// CREDITHOPPER - CONFIGURATION
// ===========================================

require('dotenv').config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // Database
  databaseUrl: process.env.DATABASE_URL,
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Claude API
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: 'claude-sonnet-4-20250514',
    maxTokens: 4096,
  },
  
  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '/api/auth/google/callback',
  },
  
  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',
  
  // File Upload
  upload: {
    maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50,
    maxFileSizeBytes: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 50) * 1024 * 1024,
    directory: process.env.UPLOAD_DIR || './uploads',
    allowedMimeTypes: [
      'application/pdf',
      'text/html',
      'application/xhtml+xml',
      'image/png',
      'image/jpeg',
    ],
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },
  
  // Credit Report Settings
  creditReport: {
    retentionDays: 90, // Auto-delete after 90 days
    maxReportsPerUser: 10,
  },
  
  // Dispute Settings
  dispute: {
    bureauResponseDays: 30,
    furnisherResponseDays: 30,
    movResponseDays: 15,
  },
};

// Validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];

if (config.env === 'production') {
  requiredEnvVars.push('ANTHROPIC_API_KEY');
}

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && config.env === 'production') {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

module.exports = config;
