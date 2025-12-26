// ===========================================
// CREDITHOPPER - EXPRESS APP SETUP
// ===========================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('./config');

// Create Express app
const app = express();

// Trust proxy - required for Railway/Heroku/etc behind load balancers
app.set('trust proxy', 1);

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Helmet - Security headers
app.use(helmet());

// CORS - Cross-Origin Resource Sharing
app.use(cors({
  origin: config.env === 'production' 
    ? config.frontendUrl 
    : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ===========================================
// BODY PARSING
// ===========================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// REQUEST LOGGING (Development)
// ===========================================

if (config.env === 'development') {
  app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
  });
}

// ===========================================
// HEALTH CHECK
// ===========================================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CreditHopper API is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    message: 'CreditHopper API is running',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// ===========================================
// API ROUTES
// ===========================================

// Auth routes (register, login, password reset)
app.use('/api/auth', require('./routes/auth.routes'));

// Credit reports routes (upload, list, parse, delete)
app.use('/api/reports', require('./routes/reports.routes'));

// Letters routes (generate, templates)
app.use('/api/letters', require('./routes/letters.routes'));

// Negative items routes (CRUD, analysis)
app.use('/api/items', require('./routes/items.routes'));

// Parser routes (text extraction, bureau detection)
app.use('/api/parser', require('./routes/parser.routes'));

// Disputes routes (create, track, respond)
app.use('/api/disputes', require('./routes/disputes.routes'));

// Dashboard routes (stats, wins, activity)
app.use('/api/dashboard', require('./routes/dashboard.routes'));

// Bundles routes (free letter bundles, downloads)
app.use('/api/bundles', require('./routes/bundles.routes'));

// API info route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CreditHopper API',
    version: '1.0.0',
    documentation: 'https://docs.credithopper.io',
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/auth/register ✅',
        login: 'POST /api/auth/login ✅',
        me: 'GET /api/auth/me ✅',
        logout: 'POST /api/auth/logout ✅',
        forgotPassword: 'POST /api/auth/forgot-password ✅',
        resetPassword: 'POST /api/auth/reset-password ✅',
        changePassword: 'POST /api/auth/change-password ✅',
        updateProfile: 'PATCH /api/auth/profile ✅',
        updateSSN: 'POST /api/auth/ssn ✅',
        verifySSN: 'POST /api/auth/verify-ssn ✅',
      },
      reports: {
        upload: 'POST /api/reports/upload ✅',
        list: 'GET /api/reports ✅',
        get: 'GET /api/reports/:id ✅',
        parse: 'POST /api/reports/:id/parse ✅',
        download: 'GET /api/reports/:id/download ✅',
        update: 'PATCH /api/reports/:id ✅',
        delete: 'DELETE /api/reports/:id ✅',
        limits: 'GET /api/reports/limits ✅',
      },
      items: {
        list: 'GET /api/items ✅',
        get: 'GET /api/items/:id ✅',
        create: 'POST /api/items ✅',
        update: 'PATCH /api/items/:id ✅',
        delete: 'DELETE /api/items/:id ✅',
        analyze: 'GET /api/items/:id/analyze ✅',
        markDeleted: 'POST /api/items/:id/mark-deleted ✅',
        bulkUpdate: 'POST /api/items/bulk-update ✅',
        stats: 'GET /api/items/stats ✅',
        types: 'GET /api/items/types ✅',
      },
      disputes: {
        create: 'POST /api/disputes ✅',
        list: 'GET /api/disputes ✅',
        get: 'GET /api/disputes/:id ✅',
        update: 'PATCH /api/disputes/:id ✅',
        delete: 'DELETE /api/disputes/:id ✅',
        generateLetter: 'POST /api/disputes/:id/generate-letter ✅',
        mail: 'POST /api/disputes/:id/mail ✅',
        logResponse: 'POST /api/disputes/:id/response ✅',
        advance: 'POST /api/disputes/:id/advance ✅',
        complete: 'POST /api/disputes/:id/complete ✅',
        attention: 'GET /api/disputes/attention ✅',
        stats: 'GET /api/disputes/stats ✅',
        timeline: 'GET /api/disputes/item/:itemId/timeline ✅',
        responseTypes: 'GET /api/disputes/response-types ✅',
      },
      parser: {
        supportedFormats: 'GET /api/parser/supported-formats ✅',
        extractText: 'POST /api/parser/extract-text ✅',
        detectBureau: 'POST /api/parser/detect-bureau ✅',
        parseText: 'POST /api/parser/parse-text ✅',
        parseAccount: 'POST /api/parser/parse-account ✅',
        reparse: 'POST /api/parser/reparse ✅',
      },
      letters: {
        generate: 'POST /api/letters/generate ✅',
        templates: 'GET /api/letters/templates ✅',
        templateById: 'GET /api/letters/templates/:id ✅',
        fillTemplate: 'POST /api/letters/fill-template ✅',
        recommend: 'GET /api/letters/recommend ✅',
        types: 'GET /api/letters/types ✅',
      },
      dashboard: {
        overview: 'GET /api/dashboard ✅',
        items: 'GET /api/dashboard/items ✅',
        disputes: 'GET /api/dashboard/disputes ✅',
        winsStats: 'GET /api/dashboard/wins-stats ✅',
        attention: 'GET /api/dashboard/attention ✅',
        progress: 'GET /api/dashboard/progress ✅',
        activity: 'GET /api/dashboard/activity ✅',
        winTypes: 'GET /api/dashboard/win-types ✅',
        createWin: 'POST /api/dashboard/wins ✅',
        listWins: 'GET /api/dashboard/wins ✅',
        getWin: 'GET /api/dashboard/wins/:id ✅',
        deleteWin: 'DELETE /api/dashboard/wins/:id ✅',
      },
    },
  });
});

// ===========================================
// 404 HANDLER
// ===========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// ===========================================
// ERROR HANDLER
// ===========================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: `File too large. Maximum size is ${config.upload.maxFileSizeMB}MB`,
    });
  }
  
  // Validation error (Zod)
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors,
    });
  }
  
  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired',
    });
  }
  
  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: 'A record with this value already exists',
    });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      error: 'Record not found',
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    error: config.env === 'production' 
      ? 'Internal server error' 
      : err.message,
  });
});

module.exports = app;
