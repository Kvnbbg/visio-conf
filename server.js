const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

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
        tracesSampleRate: 1.0,
        environment: process.env.NODE_ENV || 'development'
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

// Sentry request handler (must be first)
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
}

// Request logging middleware
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL, 'https://your-app.vercel.app']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
const sessionConfig = {
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    },
    name: 'visio-conf-session'
};

// Use Redis store if available, otherwise use memory store
if (redisClient && RedisStore) {
    sessionConfig.store = new RedisStore({ client: redisClient });
    logger.info('Using Redis session store');
} else {
    logger.warn('Using memory session store (not recommended for production)');
}

app.use(session(sessionConfig));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/dist', express.static(path.join(__dirname, 'dist')));

// France Travail OAuth configuration
const franceTravailConfig = {
    clientId: process.env.FRANCETRAVAIL_CLIENT_ID,
    clientSecret: process.env.FRANCETRAVAIL_CLIENT_SECRET,
    redirectUri: process.env.FRANCETRAVAIL_REDIRECT_URI || `http://localhost:${PORT}/auth/francetravail/callback`,
    scope: process.env.FRANCETRAVAIL_SCOPE || 'openid profile email'
};

// Validate required environment variables
const requiredEnvVars = [
    'ZEGOCLOUD_APP_ID',
    'ZEGOCLOUD_SERVER_SECRET',
    'FRANCETRAVAIL_CLIENT_ID',
    'FRANCETRAVAIL_CLIENT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
    logger.error('Missing required environment variables:', missingEnvVars);
    process.exit(1);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0',
        services: {
            redis: redisClient ? 'connected' : 'disconnected',
            franceTravail: franceTravailConfig.clientId ? 'configured' : 'not configured',
            zegocloud: process.env.ZEGOCLOUD_APP_ID ? 'configured' : 'not configured'
        }
    };

    // Check if critical services are working
    if (!franceTravailConfig.clientId || !process.env.ZEGOCLOUD_APP_ID) {
        health.status = 'degraded';
    }

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

// Authentication status endpoint
app.get('/api/auth/status', (req, res) => {
    try {
        if (req.session && req.session.user) {
            res.json({
                authenticated: true,
                user: {
                    id: req.session.user.id,
                    name: req.session.user.name,
                    email: req.session.user.email
                }
            });
        } else {
            res.json({ authenticated: false });
        }
    } catch (error) {
        logger.error('Error checking auth status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// France Travail login endpoint
app.get('/auth/francetravail/login', (req, res) => {
    try {
        const { codeVerifier, codeChallenge } = generatePKCE();
        const state = Math.random().toString(36).substring(2, 15);
        
        // Store PKCE parameters in session
        req.session.codeVerifier = codeVerifier;
        req.session.state = state;
        
        const authUrl = buildAuthUrl(franceTravailConfig, state, codeChallenge);
        
        logger.info('Redirecting to France Travail OAuth', { state });
        res.redirect(authUrl);
    } catch (error) {
        logger.error('Error initiating France Travail login:', error);
        res.status(500).json({ error: 'Failed to initiate login' });
    }
});

// France Travail callback endpoint
app.get('/auth/francetravail/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            logger.error('OAuth error:', error);
            return res.redirect('/?error=oauth_error');
        }
        
        if (!code || !state) {
            logger.error('Missing code or state parameter');
            return res.redirect('/?error=missing_parameters');
        }
        
        // Validate state parameter
        if (state !== req.session.state) {
            logger.error('State parameter mismatch');
            return res.redirect('/?error=invalid_state');
        }
        
        // Exchange code for token
        const tokenData = await ftExchangeCode(
            franceTravailConfig, 
            code, 
            req.session.codeVerifier
        );
        
        // Get user information
        const userInfo = await getUserInfo(tokenData.access_token);
        
        // Store user session
        req.session.user = {
            id: userInfo.id || userInfo.sub || 'user_' + Date.now(),
            name: userInfo.name || userInfo.given_name || 'France Travail User',
            email: userInfo.email || null,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            tokenExpiry: Date.now() + (tokenData.expires_in * 1000)
        };
        
        // Clear PKCE parameters
        delete req.session.codeVerifier;
        delete req.session.state;
        
        logger.info('User authenticated successfully', { userId: req.session.user.id });
        res.redirect('/');
    } catch (error) {
        logger.error('Error in OAuth callback:', error);
        res.redirect('/?error=authentication_failed');
    }
});

// Token refresh endpoint
app.get('/api/auth/refresh', async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.refreshToken) {
            return res.status(401).json({ error: 'No refresh token available' });
        }
        
        const tokenData = await refreshAccessToken(
            franceTravailConfig, 
            req.session.user.refreshToken
        );
        
        // Update session with new tokens
        req.session.user.accessToken = tokenData.access_token;
        if (tokenData.refresh_token) {
            req.session.user.refreshToken = tokenData.refresh_token;
        }
        req.session.user.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
        
        logger.info('Token refreshed successfully', { userId: req.session.user.id });
        res.json({ success: true, accessToken: tokenData.access_token });
    } catch (error) {
        logger.error('Error refreshing token:', error);
        res.status(401).json({ error: 'Failed to refresh token' });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    try {
        const userId = req.session.user?.id;
        
        req.session.destroy((err) => {
            if (err) {
                logger.error('Error destroying session:', err);
                return res.status(500).json({ error: 'Failed to logout' });
            }
            
            res.clearCookie('visio-conf-session');
            logger.info('User logged out successfully', { userId });
            res.json({ success: true });
        });
    } catch (error) {
        logger.error('Error during logout:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Generate ZEGOCLOUD token endpoint
app.post('/api/generate-token', 
    requireAuth, 
    validateRequest(['roomID', 'userID']), 
    async (req, res) => {
        try {
            const { roomID, userID } = req.body;
            
            // Validate token parameters
            const validation = validateTokenParams(roomID, userID);
            if (!validation.isValid) {
                return res.status(400).json({ error: validation.error });
            }
            
            // Generate ZEGOCLOUD token
            const token = generateZegoToken(
                roomID,
                userID,
                process.env.ZEGOCLOUD_APP_ID,
                process.env.ZEGOCLOUD_SERVER_SECRET
            );
            
            logger.info('ZEGOCLOUD token generated', { 
                roomID, 
                userID, 
                userId: req.session.user.id 
            });
            
            res.json({ 
                token,
                appID: process.env.ZEGOCLOUD_APP_ID,
                roomID,
                userID
            });
        } catch (error) {
            logger.error('Error generating ZEGOCLOUD token:', error);
            res.status(500).json({ error: 'Failed to generate token' });
        }
    }
);

// Serve React app for all other routes
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    
    // Check if built React app exists
    if (require('fs').existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        // Fallback to development HTML
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});

// Error handling middleware
if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
}

app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    // Close Redis connection
    await closeRedisConnection();
    
    // Close server
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    
    // Close Redis connection
    await closeRedisConnection();
    
    // Close server
    server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Visio-Conf server running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        redis: redisClient ? 'enabled' : 'disabled',
        sentry: process.env.SENTRY_DSN ? 'enabled' : 'disabled'
    });
});

module.exports = app;