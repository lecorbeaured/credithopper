// ===========================================
// CREDITHOPPER - API RESPONSE UTILITIES
// ===========================================

/**
 * Send a success response
 */
function success(res, data = null, message = 'Success', statusCode = 200) {
  const response = {
    success: true,
    message,
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
function created(res, data, message = 'Created successfully') {
  return success(res, data, message, 201);
}

/**
 * Send an error response
 */
function error(res, message = 'An error occurred', statusCode = 400, details = null) {
  const response = {
    success: false,
    error: message,
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(statusCode).json(response);
}

/**
 * Send a not found response (404)
 */
function notFound(res, message = 'Resource not found') {
  return error(res, message, 404);
}

/**
 * Send an unauthorized response (401)
 */
function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401);
}

/**
 * Send a forbidden response (403)
 */
function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403);
}

/**
 * Send a validation error response (400)
 */
function validationError(res, errors) {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    details: errors,
  });
}

/**
 * Send a conflict response (409)
 */
function conflict(res, message = 'Resource already exists') {
  return error(res, message, 409);
}

/**
 * Send a server error response (500)
 */
function serverError(res, message = 'Internal server error') {
  return error(res, message, 500);
}

/**
 * Paginated response
 */
function paginated(res, data, pagination, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasMore: pagination.page * pagination.limit < pagination.total,
    },
  });
}

module.exports = {
  success,
  created,
  error,
  notFound,
  unauthorized,
  forbidden,
  validationError,
  conflict,
  serverError,
  paginated,
};
