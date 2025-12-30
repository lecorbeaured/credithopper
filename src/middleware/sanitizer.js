// ===========================================
// CREDITHOPPER - RESPONSE SANITIZER MIDDLEWARE
// ===========================================
// Ensures no mock data ever reaches production responses
// This is a safety net - should never actually find mock data

const { envConfig } = require('../config/environment');

/**
 * Patterns that indicate mock data
 */
const MOCK_DATA_INDICATORS = [
  '_isMockData',
  '_mockWarning',
  '_mockGeneratedAt',
  'MOCK_',
];

/**
 * Creditor names that indicate example/mock data
 */
const SUSPICIOUS_CREDITOR_NAMES = [
  'ABC COLLECTIONS',
  'ABC COLLECTION',
  'XYZ BANK',
  'XYZ COLLECTIONS',
  'TEST CREDITOR',
  'TEST BANK',
  'SAMPLE BANK',
  'SAMPLE CREDITOR',
  'EXAMPLE CREDIT',
  'EXAMPLE BANK',
  'MOCK CREDITOR',
  'FAKE BANK',
  'PLACEHOLDER',
  'DEMO BANK',
  'DEMO CREDITOR',
];

/**
 * Middleware that ensures no mock data ever reaches production responses
 */
function sanitizeResponse(req, res, next) {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override json method
  res.json = function(data) {
    // In production/staging, scan for and remove any mock data
    if (envConfig.isProduction || envConfig.isStaging) {
      const { sanitized, mockDataFound } = deepSanitize(data);
      
      // If mock data was found and removed, log alert
      if (mockDataFound) {
        console.error('SECURITY ALERT: Mock data detected in production response and removed', {
          endpoint: req.path,
          method: req.method,
          timestamp: new Date().toISOString(),
          userId: req.userId || 'anonymous',
        });
      }
      
      return originalJson(sanitized);
    }
    
    // In development/test, still check but just warn
    if (envConfig.isDevelopment) {
      const { mockDataFound } = checkForMockData(data);
      if (mockDataFound) {
        console.warn('DEV WARNING: Mock data detected in response', {
          endpoint: req.path,
        });
      }
    }
    
    return originalJson(data);
  };
  
  next();
}

/**
 * Deep sanitize an object, removing any mock data markers
 */
function deepSanitize(obj, path = '') {
  let mockDataFound = false;
  
  if (obj === null || obj === undefined) {
    return { sanitized: obj, mockDataFound };
  }
  
  if (Array.isArray(obj)) {
    const sanitizedArray = [];
    for (let i = 0; i < obj.length; i++) {
      const result = deepSanitize(obj[i], `${path}[${i}]`);
      
      // If this item was identified as mock data, skip it entirely
      if (result.isMockItem) {
        mockDataFound = true;
        console.error(`Removed mock item at ${path}[${i}]`);
        continue;
      }
      
      sanitizedArray.push(result.sanitized);
      if (result.mockDataFound) mockDataFound = true;
    }
    return { sanitized: sanitizedArray, mockDataFound };
  }
  
  if (typeof obj === 'object') {
    // Check for explicit mock data flag
    if (obj._isMockData === true) {
      return { sanitized: null, mockDataFound: true, isMockItem: true };
    }
    
    // Check for suspicious creditor names in extraction items
    if (obj.creditorName && SUSPICIOUS_CREDITOR_NAMES.includes(obj.creditorName.toUpperCase())) {
      console.error(`Removed item with suspicious creditor name: ${obj.creditorName} at ${path}`);
      return { sanitized: null, mockDataFound: true, isMockItem: true };
    }
    
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip mock-related keys
      if (MOCK_DATA_INDICATORS.some(indicator => key.includes(indicator))) {
        mockDataFound = true;
        continue;
      }
      
      const childResult = deepSanitize(value, `${path}.${key}`);
      
      // If child is explicitly a mock item, set to null
      if (childResult.isMockItem) {
        result[key] = null;
        mockDataFound = true;
      } else {
        result[key] = childResult.sanitized;
        if (childResult.mockDataFound) mockDataFound = true;
      }
    }
    
    return { sanitized: result, mockDataFound };
  }
  
  // For strings, check for mock patterns
  if (typeof obj === 'string') {
    if (obj.includes('_isMockData') || obj.includes('MOCK_') || obj.includes('_mockWarning')) {
      return { sanitized: '[REDACTED]', mockDataFound: true };
    }
  }
  
  return { sanitized: obj, mockDataFound };
}

/**
 * Check for mock data without modifying (for development warnings)
 */
function checkForMockData(obj, path = '') {
  let mockDataFound = false;
  
  if (obj === null || obj === undefined) {
    return { mockDataFound };
  }
  
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const result = checkForMockData(obj[i], `${path}[${i}]`);
      if (result.mockDataFound) {
        mockDataFound = true;
      }
    }
    return { mockDataFound };
  }
  
  if (typeof obj === 'object') {
    if (obj._isMockData === true) {
      return { mockDataFound: true };
    }
    
    if (obj.creditorName && SUSPICIOUS_CREDITOR_NAMES.includes((obj.creditorName || '').toUpperCase())) {
      return { mockDataFound: true };
    }
    
    for (const [key, value] of Object.entries(obj)) {
      if (MOCK_DATA_INDICATORS.some(indicator => key.includes(indicator))) {
        return { mockDataFound: true };
      }
      
      const result = checkForMockData(value, `${path}.${key}`);
      if (result.mockDataFound) {
        mockDataFound = true;
      }
    }
    
    return { mockDataFound };
  }
  
  return { mockDataFound };
}

module.exports = {
  sanitizeResponse,
  deepSanitize,
  checkForMockData,
  MOCK_DATA_INDICATORS,
  SUSPICIOUS_CREDITOR_NAMES,
};
