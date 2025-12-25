// ===========================================
// CREDITHOPPER - VALIDATION SCHEMAS (ZOD)
// ===========================================

const { z } = require('zod');

// ===========================================
// AUTH SCHEMAS
// ===========================================

const registerSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .trim(),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .trim(),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  personalUseOnly: z.boolean()
    .refine(val => val === true, 'You must confirm this account is for personal use only'),
  acceptedTerms: z.boolean()
    .refine(val => val === true, 'You must accept the Terms of Service'),
});

const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password is required'),
  remember: z.boolean().optional().default(false),
});

const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// ===========================================
// USER SCHEMAS
// ===========================================

const updateProfileSchema = z.object({
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
  phone: z.string()
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number')
    .optional()
    .nullable(),
  address: z.object({
    street: z.string().max(200).optional(),
    city: z.string().max(100).optional(),
    state: z.string().length(2, 'State must be 2 characters').optional(),
    zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code').optional(),
  }).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// ===========================================
// DISPUTE SCHEMAS
// ===========================================

const createDisputeSchema = z.object({
  negativeItemId: z.string().uuid('Invalid item ID'),
  target: z.enum(['bureau', 'furnisher'], {
    errorMap: () => ({ message: 'Target must be either "bureau" or "furnisher"' }),
  }),
  bureau: z.enum(['equifax', 'experian', 'transunion']).optional(),
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters')
    .optional(),
  personalContext: z.string()
    .max(500, 'Personal context must be less than 500 characters')
    .optional(),
});

const logResponseSchema = z.object({
  responseType: z.enum([
    'deleted',
    'verified',
    'updated',
    'no_response',
    'frivolous',
    'investigating',
  ]),
  responseDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  documentPath: z.string().optional(),
});

// ===========================================
// NEGATIVE ITEM SCHEMAS
// ===========================================

const createNegativeItemSchema = z.object({
  creditorName: z.string()
    .min(1, 'Creditor name is required')
    .max(200, 'Creditor name must be less than 200 characters'),
  accountNumber: z.string()
    .max(50, 'Account number must be less than 50 characters')
    .optional(),
  accountType: z.enum([
    'collection',
    'late_payment',
    'charge_off',
    'repossession',
    'foreclosure',
    'bankruptcy',
    'judgment',
    'tax_lien',
    'inquiry',
    'medical',
    'student_loan',
    'other',
  ]),
  balance: z.number().min(0).optional(),
  dateOpened: z.string().datetime().optional(),
  dateOfFirstDelinquency: z.string().datetime().optional(),
  lastActivityDate: z.string().datetime().optional(),
  bureaus: z.array(z.enum(['equifax', 'experian', 'transunion']))
    .min(1, 'At least one bureau is required'),
  notes: z.string().max(1000).optional(),
});

// ===========================================
// LETTER GENERATION SCHEMA
// ===========================================

const generateLetterSchema = z.object({
  itemId: z.string().uuid('Invalid item ID'),
  target: z.enum(['bureau', 'furnisher']),
  bureau: z.enum(['equifax', 'experian', 'transunion']).optional(),
  round: z.number().int().min(1).max(4).default(1),
  personalContext: z.object({
    reason: z.string().max(500).optional(),
    stance: z.enum(['confused', 'frustrated', 'firm', 'legal']).optional(),
    creditGoal: z.string().max(200).optional(),
  }).optional(),
});

// ===========================================
// PAGINATION SCHEMA
// ===========================================

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ===========================================
// HELPER: Validate Request
// ===========================================

function validate(schema) {
  return (req, res, next) => {
    try {
      req.validated = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

module.exports = {
  // Auth
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  
  // User
  updateProfileSchema,
  changePasswordSchema,
  
  // Dispute
  createDisputeSchema,
  logResponseSchema,
  
  // Negative Item
  createNegativeItemSchema,
  
  // Letter
  generateLetterSchema,
  
  // Pagination
  paginationSchema,
  
  // Helpers
  validate,
  validateQuery,
};
