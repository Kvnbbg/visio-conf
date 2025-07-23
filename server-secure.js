/**
 * Enhanced Secure Server for Visio-Conf v3.0
 * Implements comprehensive security measures and modern practices
 */

const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import security middleware
const {
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
} = require('./lib/security');

// Import logging and monitoring
const logger = require('./lib/logger');
const { createRedisClient, getRedisClient, closeRedisConnection } = require('./lib/redis');

// Import our modular components
const { generatePKCE, buildAuthUrl, exchangeCodeForToken } = require('./lib/auth');
const { generateZegoToken, validateTokenParams } = require('./lib/zegoToken');
const { requireAuth, validateRequest, errorHandler, requestLogger } = require('./lib/middleware');
const { 
    exchangeCodeForToken: ftExchangeCode, 
    refreshAccessToken, 
    getUserInfo, 
    validateToken,
    FRANCETRAVAIL_AUTH_URL 
} = require('./lib/franceTravailAuth');

// Initialize Sentry for error tracking (optional)
if (process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    const Tracing = require('@sentry/tracing');
    
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            new Sentry.Integrations.Http({ tracing: true }),
            new Tracing.Integrations.Express({ app }),
        ],
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        environment: process.env.NODE_ENV || 'development',
        beforeSend(event) {
            // Filter out sensitive information
            if (event.request) {
                delete event.request.headers?.authorization;
                delete event.request.headers?.cookie;
            }
            return event;
        }
    });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize Redis client
let redisClient = null;
let RedisStore = null;

const initializeRedis = async () => {
    try {
        redisClient = await createRedisClient();
        if (redisClient) {
            RedisStore = require('connect-redis').default;
            logger.info('Redis initialized successfully');
        } else {
            logger.warn('Redis not available, using memory store for sessions');
        }
    } catch (error) {
        logger.error('Failed to initialize Redis:', error);
    }
};

// Initialize Redis
initializeRedis();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Sentry request handler (must be first)
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

// Security headers (before any other middleware)
app.use(securityHeaders);

// Helmet for additional security headers
app.use(helmetConfig);

// Request logging middleware
app.use(requestLogger);

// Input sanitization (early in the pipeline)
app.use(sanitizeInput);

// Rate limiting with Redis store
const generalLimiter = createRateLimiter(redisClient);
const authLimiter = createAuthRateLimiter(redisClient);

app.use('/api/', generalLimiter);
app.use('/auth/', authLimiter);

// CORS configuration with enhanced security
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.NODE_ENV === 'production' 
            ? [process.env.FRONTEND_URL, 'https://your-app.vercel.app']
            : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'];
        
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Token']
}));

// Body parsing middleware with size limits
app.use(express.json({ 
    limit: '1mb',
    verify: (req, res, buf) => {
        // Store raw body for webhook verification if needed
        req.rawBody = buf;
    }
}));
app.use(express.urlencoded({ 
    extended: true, 
    limit: '1mb',
    parameterLimit: 100
}));

// Session configuration with enhanced security
const sessionConfig = {
    name: 'visio.sid', // Don't use default session name
    secret: process.env.SESSION_SECRET || 'your-super-secret-session-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on activity
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // Prevent XSS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    }
};

// Use Redis store if available
if (redisClient && RedisStore) {
    sessionConfig.store = new RedisStore({
        client: redisClient,
        prefix: 'sess:',
        ttl: 24 * 60 * 60 // 24 hours in seconds
    });
}

app.use(session(sessionConfig));

// CSRF protection
app.use(generateCSRFToken);

// Serve static files with security headers
app.use(express.static('public', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
        if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
        // Add cache control for static assets
        res.setHeader('Cache-Control', 'public, max-age=31536000');
    }
}));

// Health check endpoint (no auth required)
app.get('/api/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '3.0.0',
        redis: redisClient ? 'connected' : 'disconnected'
    };
    
    res.status(200).json(healthCheck);
});

// CSRF token endpoint
app.get('/api/csrf-token', (req, res) => {
    res.json({ csrfToken: req.session.csrfToken });
});

// Enhanced authentication routes with validation
app.get('/auth/francetravail', (req, res) => {
    try {
        const { codeVerifier, codeChallenge } = generatePKCE();
        const state = require('crypto').randomBytes(32).toString('hex');
        
        // Store PKCE and state in session
        req.session.codeVerifier = codeVerifier;
        req.session.state = state;
        
        const authUrl = buildAuthUrl(codeChallenge, state);
        
        logger.info('Redirecting to France Travail OAuth', {
            sessionId: req.sessionID,
            state: state.substring(0, 8) + '...' // Log partial state for debugging
        });
        
        res.redirect(authUrl);
    } catch (error) {
        logger.error('Error initiating France Travail auth:', error);
        res.status(500).json({ error: 'Authentication initialization failed' });
    }
});

app.get('/auth/francetravail/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            logger.warn('OAuth error received:', error);
            return res.redirect('/?error=oauth_error');
        }
        
        if (!code || !state) {
            logger.warn('Missing code or state in OAuth callback');
            return res.redirect('/?error=missing_parameters');
        }
        
        // Validate state parameter
        if (state !== req.session.state) {
            logger.warn('State parameter mismatch', {
                expected: req.session.state?.substring(0, 8) + '...',
                received: state?.substring(0, 8) + '...'
            });
            return res.redirect('/?error=invalid_state');
        }
        
        const codeVerifier = req.session.codeVerifier;
        if (!codeVerifier) {
            logger.warn('Missing code verifier in session');
            return res.redirect('/?error=missing_verifier');
        }
        
        // Exchange code for token
        const tokenData = await ftExchangeCode(code, codeVerifier);
        
        // Get user info
        const userInfo = await getUserInfo(tokenData.access_token);
        
        // Store user session
        req.session.user = {
            id: userInfo.sub,
            email: userInfo.email,
            name: userInfo.given_name + ' ' + userInfo.family_name,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiry: Date.now() + (tokenData.expires_in * 1000)
        };
        
        // Clean up PKCE data
        delete req.session.codeVerifier;
        delete req.session.state;
        
        logger.info('User authenticated successfully', {
            userId: userInfo.sub,
            email: userInfo.email
        });
        
        res.redirect('/?auth=success');
    } catch (error) {
        logger.error('OAuth callback error:', error);
        res.redirect('/?error=auth_failed');
    }
});

// Logout endpoint with CSRF protection
app.post('/auth/logout', csrfProtection, (req, res) => {
    const userId = req.session.user?.id;
    
    req.session.destroy((err) => {
        if (err) {
            logger.error('Session destruction error:', err);
            return res.status(500).json({ error: 'Logout failed' });
        }
        
        logger.info('User logged out', { userId });
        res.clearCookie('visio.sid');
        res.json({ message: 'Logged out successfully' });
    });
});

// Protected API routes
app.use('/api/protected', requireAuth);

// ZEGOCLOUD token generation with validation
app.post('/api/protected/zego-token', 
    validateInput(validationSchemas.meetingCreation),
    async (req, res) => {
        try {
            const { appId, userId, roomId, privilege, expire } = req.validatedBody;
            
            if (!validateTokenParams(appId, userId, roomId)) {
                return res.status(400).json({ error: 'Invalid token parameters' });
            }
            
            const token = generateZegoToken(appId, userId, roomId, privilege, expire);
            
            logger.info('ZEGO token generated', {
                userId: req.session.user.id,
                roomId,
                appId
            });
            
            res.json({ token });
        } catch (error) {
            logger.error('ZEGO token generation error:', error);
            res.status(500).json({ error: 'Token generation failed' });
        }
    }
);

// User profile endpoint
app.get('/api/protected/profile', (req, res) => {
    const user = req.session.user;
    res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        // Don't expose tokens
    });
});

// Update user profile with validation
app.put('/api/protected/profile',
    csrfProtection,
    validateInput(validationSchemas.profileUpdate),
    (req, res) => {
        try {
            // In a real app, this would update the database
            const updates = req.validatedBody;
            
            logger.info('Profile update requested', {
                userId: req.session.user.id,
                updates: Object.keys(updates)
            });
            
            res.json({ message: 'Profile updated successfully', updates });
        } catch (error) {
            logger.error('Profile update error:', error);
            res.status(500).json({ error: 'Profile update failed' });
        }
    }
);

// Serve main application
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Security error handler
app.use(securityErrorHandler);

// General error handler
app.use(errorHandler);

// Sentry error handler (must be last)
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

// 404 handler
app.use('*', (req, res) => {
    logger.warn('404 - Route not found', {
        path: req.originalUrl,
        method: req.method,
        ip: req.ip
    });
    
    res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl
    });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    
    server.close(async () => {
        logger.info('HTTP server closed');
        
        if (redisClient) {
            await closeRedisConnection();
        }
        
        process.exit(0);
    });
    
    // Force close after 30 seconds
    setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Secure Visio-Conf server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        redis: redisClient ? 'enabled' : 'disabled',
        sentry: process.env.SENTRY_DSN ? 'enabled' : 'disabled'
    });
});

module.exports = app;

