const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock bundles data (all free now)
const bundles = [
  { id: 1, slug: 'initial-dispute-starter-kit', name: 'Initial Dispute Starter Kit', letterCount: 6, price: 0, value: 'Free' },
  { id: 2, slug: 'collection-crusher-bundle', name: 'Collection Crusher Bundle', letterCount: 8, price: 0, value: 'Free' },
  { id: 3, slug: 'medical-debt-destroyer', name: 'Medical Debt Destroyer', letterCount: 8, price: 0, value: 'Free' },
  { id: 4, slug: 'mega-bundle-all-letters', name: 'MEGA Bundle - All 55 Letters', letterCount: 55, price: 0, value: 'Free' }
];

// Mock users
const users = [];
let userIdCounter = 1;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// ============ BUNDLES ENDPOINTS ============

// List all bundles
app.get('/api/bundles', (req, res) => {
  res.json({ success: true, data: bundles });
});

// Get bundle by slug
app.get('/api/bundles/:slug', (req, res) => {
  const bundle = bundles.find(b => b.slug === req.params.slug);
  if (!bundle) {
    return res.status(404).json({ success: false, error: 'Bundle not found' });
  }
  res.json({ success: true, data: bundle });
});

// Download bundle (with email capture)
app.post('/api/bundles/:slug/download', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, error: 'Invalid email format' });
  }
  
  const bundle = bundles.find(b => b.slug === req.params.slug);
  if (!bundle) {
    return res.status(404).json({ success: false, error: 'Bundle not found' });
  }
  
  // Log email capture (in production, save to database)
  console.log(`[LEAD CAPTURED] Email: ${email}, Bundle: ${bundle.name}`);
  
  res.json({ 
    success: true, 
    data: { 
      downloadUrl: `/bundles/${req.params.slug}.pdf`,
      bundle: bundle.name,
      email: email
    },
    message: 'Download link generated'
  });
});

// ============ AUTH ENDPOINTS ============

// Register
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
  }
  
  // Check if user exists
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ success: false, error: 'Email already registered' });
  }
  
  const user = { id: userIdCounter++, email, name: name || email.split('@')[0] };
  users.push({ ...user, password }); // In production, hash password
  
  res.status(201).json({ 
    success: true, 
    data: { 
      user,
      token: 'mock-jwt-token-' + user.id
    },
    message: 'Registration successful'
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }
  
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
  
  res.json({ 
    success: true, 
    data: { 
      user: { id: user.id, email: user.email, name: user.name },
      token: 'mock-jwt-token-' + user.id
    },
    message: 'Login successful'
  });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Forgot password
app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, error: 'Email is required' });
  }
  
  // In production, send actual email
  console.log(`[PASSWORD RESET] Requested for: ${email}`);
  
  res.json({ 
    success: true, 
    message: 'If an account exists with this email, a password reset link has been sent'
  });
});

// Get current user (protected - mock)
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  
  // Mock user for testing
  res.json({ 
    success: true, 
    data: { 
      id: 1, 
      email: 'test@example.com', 
      name: 'Test User',
      plan: 'free'
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 CreditHopper API Test Server`);
  console.log(`   Running on http://localhost:${PORT}`);
  console.log(`\n📋 Available Endpoints:`);
  console.log(`   GET  /api/health`);
  console.log(`   GET  /api/bundles`);
  console.log(`   GET  /api/bundles/:slug`);
  console.log(`   POST /api/bundles/:slug/download`);
  console.log(`   POST /api/auth/register`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/logout`);
  console.log(`   POST /api/auth/forgot-password`);
  console.log(`   GET  /api/auth/me`);
  console.log(`\n`);
});
