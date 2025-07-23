/**
 * Enhanced Security Middleware for Visio-Conf
 * Implements comprehensive security measures including:
 * - Helmet for security headers
 * - Input validation and sanitization
 * - Rate limiting with Redis
 * - CSRF protection
 * - Content Security Policy
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const RedisStore = require('express-rate-limit-redis');
const { body, validationResult } = require('express-validator');
const Joi = require('joi');
const crypto = require('crypto');
const logger = require('./logger');

/**
 * Configure Helmet with security headers
 */
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for React CDN
        "https://unpkg.com",
        "https://cdn.jsdelivr.net",
        "https://zegocloud.github.io"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://api.zegocloud.com",
        "https://francetravail.io",
        "wss:"
      ],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "https:"],
      frameSrc: ["'self'", "https:"]
    }
  },
  crossOriginEmbedderPolicy: false, // Required for video conferencing
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Enhanced rate limiting with Redis store
 */
const createRateLimiter = (redisClient) => {
  const store = redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  }) : undefined;

  return rateLimit({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(429).json({
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });
};

/**
 * Strict rate limiting for authentication endpoints
 */
const createAuthRateLimiter = (redisClient) => {
  const store = redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'auth_rl:',
  }) : undefined;

  return rateLimit({
    store,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(429).json({
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
      });
    }
  });
};

/**
 * Input validation schemas using Joi
 */
const validationSchemas = {
  // User registration/login validation
  userAuth: Joi.object({
    email: Joi.string().email().max(255).required(),
    password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).required(),
    rememberMe: Joi.boolean().optional()
  }),

  // Meeting creation validation
  meetingCreation: Joi.object({
    title: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(1000).optional(),
    startTime: Joi.date().iso().min('now').required(),
    duration: Joi.number().integer().min(1).max(480).required(), // Max 8 hours
    participants: Joi.array().items(Joi.string().email()).max(50).optional()
  }),

  // User profile update validation
  profileUpdate: Joi.object({
    firstName: Joi.string().min(1).max(50).optional(),
    lastName: Joi.string().min(1).max(50).optional(),
    language: Joi.string().valid('fr', 'en', 'es', 'zh').optional(),
    timezone: Joi.string().max(50).optional()
  })
};

/**
 * Validation middleware factory
 */
const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      logger.warn('Input validation failed', {
        ip: req.ip,
        path: req.path,
        errors
      });

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.validatedBody = value;
    next();
  };
};

/**
 * CSRF protection middleware
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET requests and API endpoints with valid JWT
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      hasToken: !!token,
      hasSessionToken: !!sessionToken
    });

    return res.status(403).json({
      error: 'Invalid CSRF token'
    });
  }

  next();
};

/**
 * Generate CSRF token for session
 */
const generateCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=self, microphone=self, geolocation=()');
  
  next();
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove potential XSS patterns
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  };

  const sanitizeObject = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Error handling middleware for security
 */
const securityErrorHandler = (err, req, res, next) => {
  // Log security-related errors
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    logger.warn('Security error detected', {
      error: err.message,
      type: err.type,
      ip: req.ip,
      path: req.path
    });

    return res.status(400).json({
      error: 'Invalid request format'
    });
  }

  next(err);
};

module.exports = {
  helmetConfig,
  createRateLimiter,
  createAuthRateLimiter,
  validationSchemas,
  validateInput,
  csrfProtection,
  generateCSRFToken,
  securityHeaders,
  sanitizeInput,
  securityErrorHandler
};

