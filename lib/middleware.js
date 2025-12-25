const crypto = require('crypto');
const logger = require('./logger');
const { AppError } = require('./errors');

/**
 * Authentication middleware to check if user is logged in
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return next(new AppError('Authentification requise', {
            statusCode: 401,
            code: 'AUTH_REQUIRED'
        }));
    }
    next();
}

/**
 * Request ID middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestId(req, res, next) {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.trim() ? incoming.trim() : crypto.randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
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
            return next(new AppError(`Champs requis manquants: ${missingFields.join(', ')}`, {
                statusCode: 400,
                code: 'MISSING_FIELDS',
                details: { missingFields }
            }));
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
    const requestId = req.requestId;
    let statusCode = err.statusCode || 500;
    let code = err.code || 'INTERNAL_ERROR';

    let message = err.message || 'Erreur interne du serveur';

    if (err.name === 'ValidationError') {
        statusCode = err.statusCode || 400;
        code = err.code || 'VALIDATION_ERROR';
        message = err.message;
    } else if (err.name === 'UnauthorizedError') {
        statusCode = err.statusCode || 401;
        code = err.code || 'UNAUTHORIZED';
        message = 'Non autorisé';
    } else if (err.code === 'ECONNREFUSED') {
        statusCode = err.statusCode || 503;
        code = 'SERVICE_UNAVAILABLE';
        message = 'Service temporairement indisponible';
    } else if (err.message === 'Not allowed by CORS') {
        statusCode = err.statusCode || 403;
        code = err.code || 'CORS_DENIED';
        message = 'Origine non autorisée';
    }

    if (message && message.includes('_')) {
        message = req.t ? req.t(message) : message;
    }

    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
        message = 'Erreur interne du serveur';
    }

    logger.error('Error occurred while processing request', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        statusCode,
        code,
        requestId
    });

    const payload = {
        error: message,
        code,
        ...(requestId ? { requestId } : {})
    };

    if (err.details) {
        payload.details = err.details;
    }

    if (err.retryAfter) {
        payload.retryAfter = err.retryAfter;
    }

    if (process.env.NODE_ENV !== 'production' && err.stack) {
        payload.stack = err.stack;
    }

    res.status(statusCode).json(payload);
}

/**
 * 404 handler middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function notFoundHandler(req, res, next) {
    return next(new AppError('Ressource non trouvée', {
        statusCode: 404,
        code: 'NOT_FOUND',
        details: { path: req.path }
    }));
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
        const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger.log({
            level: logLevel,
            message: `${req.method} ${req.originalUrl}`,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            requestId: req.requestId
        });
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

        if (requests.has(clientId)) {
            const clientRequests = requests.get(clientId).filter((time) => time > windowStart);
            requests.set(clientId, clientRequests);
        }

        const currentRequests = requests.get(clientId) || [];

        if (currentRequests.length >= maxRequests) {
            const retryAfter = Math.ceil(windowMs / 1000);
            const translatedMessage = req?.t ? req.t('auth_too_many_attempts') : 'Too many attempts. Please wait a moment.';
            return next(new AppError(translatedMessage, {
                statusCode: 429,
                code: 'RATE_LIMIT_EXCEEDED',
                details: { retryAfter },
                retryAfter
            }));
        }

        currentRequests.push(now);
        requests.set(clientId, currentRequests);

        next();
    };
}

module.exports = {
    requireAuth,
    requestId,
    validateRequest,
    errorHandler,
    notFoundHandler,
    requestLogger,
    rateLimit
};
