/**
 * Error handling middleware for Express applications
 */

/**
 * Authentication middleware to check if user is logged in
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.status(401).json({ 
            error: 'Authentification requise',
            code: 'AUTH_REQUIRED'
        });
    }
    next();
}

/**
 * Request validation middleware
 * @param {Array} requiredFields - Array of required field names
 * @returns {Function} Express middleware function
 */
function validateRequest(requiredFields) {
    return (req, res, next) => {
        const missingFields = [];
        
        for (const field of requiredFields) {
            if (!req.body[field] || (typeof req.body[field] === 'string' && req.body[field].trim() === '')) {
                missingFields.push(field);
            }
        }
        
        if (missingFields.length > 0) {
            return res.status(400).json({
                error: `Champs requis manquants: ${missingFields.join(', ')}`,
                code: 'MISSING_FIELDS',
                missingFields
            });
        }
        
        next();
    };
}

/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
    console.error('Error occurred:', err);
    
    // Default error response
    let statusCode = 500;
    let message = 'Erreur interne du serveur';
    let code = 'INTERNAL_ERROR';
    
    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = err.message;
        code = 'VALIDATION_ERROR';
    } else if (err.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Non autorisé';
        code = 'UNAUTHORIZED';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service temporairement indisponible';
        code = 'SERVICE_UNAVAILABLE';
    }
    
    // Don't expose internal errors in production
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Erreur interne du serveur';
    }
    
    res.status(statusCode).json({
        error: message,
        code,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
}

/**
 * 404 handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Ressource non trouvée',
        code: 'NOT_FOUND',
        path: req.path
    });
}

/**
 * Request logging middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'error' : 'info';
        
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        
        if (logLevel === 'error') {
            console.error(`Error details: ${req.method} ${req.path} - Status: ${res.statusCode}`);
        }
    });
    
    next();
}

/**
 * Rate limiting middleware (simple implementation)
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware function
 */
function rateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const requests = new Map();
    
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        const windowStart = now - windowMs;
        
        // Clean old entries
        if (requests.has(clientId)) {
            const clientRequests = requests.get(clientId).filter(time => time > windowStart);
            requests.set(clientId, clientRequests);
        }
        
        // Check current request count
        const currentRequests = requests.get(clientId) || [];
        
        if (currentRequests.length >= maxRequests) {
            return res.status(429).json({
                error: 'Trop de requêtes. Veuillez réessayer plus tard.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }
        
        // Add current request
        currentRequests.push(now);
        requests.set(clientId, currentRequests);
        
        next();
    };
}

module.exports = {
    requireAuth,
    validateRequest,
    errorHandler,
    notFoundHandler,
    requestLogger,
    rateLimit
};