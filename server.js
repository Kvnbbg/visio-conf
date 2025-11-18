const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const logger = require('./lib/logger');

let helmet = null;
try {
    helmet = require('helmet');
} catch (error) {
    logger.warn('Helmet not available, applying fallback security headers');
}
const { generateZegoToken, validateTokenParams } = require('./lib/tokenGenerator');
const {
    generatePKCE,
    generateState,
    buildAuthUrl,
    decodeIdToken,
    validateState
} = require('./lib/auth');
const { buildRequestContext, recordAuditEvent } = require('./lib/auditTrail');
const {
    exchangeCodeForToken: ftExchangeCode,
    refreshAccessToken: ftRefreshAccessToken,
    getUserInfo: ftGetUserInfo,
    validateToken: ftValidateToken,
    FRANCETRAVAIL_AUTH_URL
} = require('./lib/franceTravailAuth');
const {
    requestLogger,
    errorHandler,
    notFoundHandler,
    rateLimit: createRateLimit,
    validateRequest
} = require('./lib/middleware');
const {
    createRedisClient,
    closeRedisConnection
} = require('./lib/redis');

const TELEMETRY_MAX_REQUEST_BYTES = parseInt(process.env.TELEMETRY_MAX_REQUEST_BYTES || '20480', 10);
const TELEMETRY_MAX_EVENTS_PER_REQUEST = parseInt(process.env.TELEMETRY_MAX_EVENTS_PER_REQUEST || '20', 10);
const TELEMETRY_MAX_DETAIL_KEYS = parseInt(process.env.TELEMETRY_MAX_DETAIL_KEYS || '20', 10);
const TELEMETRY_MAX_DETAIL_VALUE_LENGTH = parseInt(process.env.TELEMETRY_MAX_DETAIL_VALUE_LENGTH || '512', 10);

const app = express();
const SPA_EXCLUDED_PREFIXES = ['/api', '/auth', '/health', '/locales'];

// Optional Sentry instrumentation
let Sentry = null;
let Tracing = null;
if (process.env.SENTRY_DSN) {
    try {
        Sentry = require('@sentry/node');
        Tracing = require('@sentry/tracing');

        Sentry.init({
            dsn: process.env.SENTRY_DSN,
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Tracing.Integrations.Express({ app })
            ],
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            environment: process.env.NODE_ENV || 'development',
            beforeSend(event) {
                if (event.request && event.request.headers) {
                    delete event.request.headers.authorization;
                    delete event.request.headers.cookie;
                }
                return event;
            }
        });

        app.use(Sentry.Handlers.requestHandler());
        app.use(Sentry.Handlers.tracingHandler());
    } catch (error) {
        logger.error('Failed to initialise Sentry instrumentation', { error: error.message });
    }
}

const isProduction = process.env.NODE_ENV === 'production';
const hasFranceTravailCredentials = Boolean(
    process.env.FRANCETRAVAIL_CLIENT_ID &&
    process.env.FRANCETRAVAIL_CLIENT_SECRET &&
    process.env.FRANCETRAVAIL_CLIENT_ID !== 'demo_client_id'
);
const isDemoMode = process.env.DEMO_MODE === 'true' || (!process.env.DEMO_MODE && !hasFranceTravailCredentials);

if (isDemoMode) {
    logger.warn('Application démarrée en mode démonstration. Utilisez DEMO_MODE=false en production.');
}

app.set('trust proxy', 1);

const sanitizeTelemetryString = (value) => {
    if (value === undefined || value === null) {
        return null;
    }

    return String(value).slice(0, TELEMETRY_MAX_DETAIL_VALUE_LENGTH);
};

const requireAuthenticatedSession = (req, res, next) => {
    if (req.session?.user) {
        return next();
    }

    recordAuditEvent('auth_required', {
        context: buildRequestContext(req),
        metadata: { path: req.originalUrl }
    });

    return res.status(401).json({
        error: 'Authentification requise',
        code: 'AUTH_REQUIRED'
    });
};

const sanitizeTelemetryDetails = (details = {}) => {
    if (!details || typeof details !== 'object') {
        return {};
    }

    return Object.entries(details)
        .slice(0, TELEMETRY_MAX_DETAIL_KEYS)
        .reduce((acc, [key, value]) => {
            if (value === undefined || value === null) {
                return acc;
            }

            if (typeof value === 'string') {
                acc[key] = value.slice(0, TELEMETRY_MAX_DETAIL_VALUE_LENGTH);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                acc[key] = value;
            } else {
                acc[key] = '[truncated]';
            }

            return acc;
        }, {});
};

// Security middleware
if (helmet) {
    app.use(helmet({
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false
    }));
} else {
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
}

// Request logging
app.use(requestLogger);

// Basic rate limiting for all API routes
const apiLimiter = createRateLimit(
    parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    15 * 60 * 1000
);
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);

        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Static assets
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration with optional Redis support
const sessionCookieSameSite = isProduction ? 'strict' : 'lax';
const baseSessionOptions = {
    secret: process.env.SESSION_SECRET || 'demo_session_secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        // Use automatic secure cookies outside production so vercel dev (HTTP) keeps working
        secure: isProduction ? true : 'auto',
        httpOnly: true,
        sameSite: sessionCookieSameSite,
        maxAge: 24 * 60 * 60 * 1000
    }
};

let sessionMiddleware = session(baseSessionOptions);
app.use((req, res, next) => sessionMiddleware(req, res, next));

if (process.env.NODE_ENV === 'test') {
    logger.info('Skipping Redis session store initialisation during tests');
} else {
    (async () => {
        try {
            const redisClient = await createRedisClient();
            if (redisClient) {
                const RedisStore = require('connect-redis').default;
                sessionMiddleware = session({
                    ...baseSessionOptions,
                    store: new RedisStore({
                        client: redisClient,
                        prefix: 'visio-conf:',
                        disableTouch: true
                    })
                });
                logger.info('Redis session store initialised successfully');
            } else {
                logger.info('Redis session store not configured; continuing with in-memory sessions');
            }
        } catch (error) {
            logger.error('Failed to configure Redis session store', { error: error.message });
        }
    })();
}

// Configuration constants
const ZEGOCLOUD_APP_ID = process.env.ZEGOCLOUD_APP_ID || 'demo_app_id';
const ZEGOCLOUD_SERVER_SECRET = process.env.ZEGOCLOUD_SERVER_SECRET || 'demo_server_secret';

const franceTravailConfig = {
    clientId: process.env.FRANCETRAVAIL_CLIENT_ID || 'demo_client_id',
    clientSecret: process.env.FRANCETRAVAIL_CLIENT_SECRET || 'demo_client_secret',
    redirectUri: process.env.FRANCETRAVAIL_REDIRECT_URI || 'http://localhost:3000/auth/francetravail/callback',
    authUrl: process.env.FRANCETRAVAIL_AUTH_URL || FRANCETRAVAIL_AUTH_URL
};

// Home route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Application configuration endpoint (used by the SPA)
app.get('/api/config', (req, res) => {
    res.json({
        demoMode: isDemoMode,
        franceTravailEnabled: hasFranceTravailCredentials
    });
});

// Session status endpoint
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.user) {
        recordAuditEvent('auth_status_checked', {
            actorId: req.session.user.id,
            context: buildRequestContext(req),
            metadata: { authenticated: true }
        });
        return res.json({
            authenticated: true,
            user: req.session.user
        });
    }

    recordAuditEvent('auth_status_checked', {
        context: buildRequestContext(req),
        metadata: { authenticated: false }
    });
    return res.json({ authenticated: false });
});

// Initiate France Travail authentication
app.get('/auth/francetravail/login', (req, res) => {
    if (!hasFranceTravailCredentials) {
        recordAuditEvent('france_travail_login_blocked', {
            context: buildRequestContext(req),
            metadata: { reason: 'missing_credentials' }
        });
        return res.status(400).json({ error: 'France Travail OAuth non configuré' });
    }

    try {
        const { codeVerifier, codeChallenge } = generatePKCE();
        const state = generateState();

        req.session.codeVerifier = codeVerifier;
        req.session.oauthState = state;

        const authUrl = buildAuthUrl({
            clientId: franceTravailConfig.clientId,
            redirectUri: franceTravailConfig.redirectUri,
            authUrl: franceTravailConfig.authUrl
        }, state, codeChallenge);

        let redirectHost = null;
        try {
            redirectHost = new URL(authUrl).origin;
        } catch (parseError) {
            redirectHost = franceTravailConfig.authUrl;
        }

        recordAuditEvent('france_travail_login_initiated', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req),
            metadata: { state, redirectHost }
        });

        res.redirect(authUrl);
    } catch (error) {
        logger.error('Failed to initiate France Travail authentication', { error: error.message });
        recordAuditEvent('france_travail_login_failed', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req),
            metadata: { reason: 'init_error', message: error.message }
        });
        res.status(500).json({ error: "Erreur lors de l'initiation de l'authentification" });
    }
});

// OAuth callback handler
app.get('/auth/francetravail/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            logger.error('OAuth returned an error', { error });
            recordAuditEvent('france_travail_callback_error', {
                context: buildRequestContext(req),
                metadata: { error }
            });
            return res.redirect('/?error=oauth_error');
        }

        if (!validateState(state, req.session.oauthState)) {
            logger.warn('Invalid OAuth state detected');
            recordAuditEvent('france_travail_invalid_state', {
                context: buildRequestContext(req),
                metadata: { stateReceived: state }
            });
            return res.redirect('/?error=invalid_state');
        }

        if (!code) {
            logger.error('Missing authorization code in callback');
            recordAuditEvent('france_travail_missing_code', {
                context: buildRequestContext(req)
            });
            return res.redirect('/?error=missing_code');
        }

        const tokenResponse = await ftExchangeCode({
            clientId: franceTravailConfig.clientId,
            clientSecret: franceTravailConfig.clientSecret,
            redirectUri: franceTravailConfig.redirectUri
        }, code, req.session.codeVerifier);

        const { access_token: accessToken, refresh_token: refreshToken, id_token: idToken } = tokenResponse;
        let userInfo = {};

        if (idToken) {
            userInfo = decodeIdToken(idToken);
        }

        if ((!userInfo || !userInfo.sub) && accessToken) {
            // Fall back to fetching user information from the API when possible
            userInfo = await ftGetUserInfo(accessToken);
        }

        req.session.user = {
            id: userInfo?.sub || `user_${Date.now()}`,
            name: userInfo?.name || userInfo?.given_name || 'Utilisateur',
            email: userInfo?.email || null,
            accessToken,
            refreshToken
        };

        delete req.session.codeVerifier;
        delete req.session.oauthState;

        recordAuditEvent('france_travail_login_success', {
            actorId: req.session.user.id,
            context: buildRequestContext(req),
            metadata: {
                hasEmail: Boolean(req.session.user.email),
                usedIdToken: Boolean(idToken)
            }
        });

        res.redirect('/?auth=success');
    } catch (callbackError) {
        logger.error('OAuth callback processing failed', { error: callbackError.message });
        recordAuditEvent('france_travail_callback_failure', {
            context: buildRequestContext(req),
            metadata: { message: callbackError.message }
        });
        res.redirect('/?error=callback_error');
    }
});

// Optional demo login endpoint
app.post('/api/auth/demo-login', (req, res) => {
    if (!isDemoMode) {
        return res.status(404).json({ error: 'Route non disponible' });
    }

    recordAuditEvent('demo_login_attempt', {
        context: buildRequestContext(req),
        metadata: { demoMode: isDemoMode }
    });

    const now = Date.now();
    const demoUser = {
        id: `demo_${now}`,
        name: req.body?.name?.trim() || 'Utilisateur Démo',
        email: req.body?.email?.trim() || 'demo@visio-conf.local',
        accessToken: 'demo_token',
        refreshToken: 'demo_refresh_token'
    };

    req.session.user = demoUser;

    recordAuditEvent('demo_login_success', {
        actorId: demoUser.id,
        context: buildRequestContext(req)
    });

    res.json({ success: true, user: demoUser });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    if (!req.session) {
        recordAuditEvent('logout_without_session', {
            context: buildRequestContext(req)
        });
        return res.json({ success: true });
    }

    req.session.destroy((error) => {
        if (error) {
            logger.error('Session destruction failed', { error: error.message });
            recordAuditEvent('logout_failure', {
                context: buildRequestContext(req),
                metadata: { message: error.message }
            });
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        recordAuditEvent('logout_success', {
            context: buildRequestContext(req)
        });
        res.json({ success: true });
    });
});

// Generate ZEGOCLOUD token endpoint
app.post('/api/generate-token',
    requireAuthenticatedSession,
    validateRequest(['roomID', 'userID']),
    (req, res) => {
        const { roomID, userID } = req.body || {};

        const validation = validateTokenParams(roomID, userID);
        if (!validation.isValid) {
            recordAuditEvent('zego_token_validation_failed', {
                actorId: req.session?.user?.id || null,
                context: buildRequestContext(req),
                metadata: { reason: validation.error, roomID }
            });
            return res.status(400).json({ error: validation.error });
        }

        const isAuthenticated = Boolean(req.session?.user);
        const effectiveUserId = (isAuthenticated ? req.session.user.id : null) || userID;
        const responseUserName = (isAuthenticated ? req.session.user?.name : null) || userID;

        try {
            const token = generateZegoToken(
                ZEGOCLOUD_APP_ID,
                ZEGOCLOUD_SERVER_SECRET,
                roomID,
                effectiveUserId
            );

            res.json({
                token,
                user: {
                    id: effectiveUserId,
                    name: responseUserName
                }
            });
            recordAuditEvent('zego_token_generated', {
                actorId: req.session?.user?.id || effectiveUserId,
                context: buildRequestContext(req),
                metadata: { roomID, authenticated: isAuthenticated }
            });
        } catch (error) {
            logger.error('Token generation failed', { error: error.message });
            recordAuditEvent('zego_token_generation_failed', {
                actorId: req.session?.user?.id || null,
                context: buildRequestContext(req),
                metadata: { roomID, message: error.message }
            });
            res.status(500).json({ error: 'Erreur lors de la génération du token' });
        }
    }
);

// Refresh France Travail access token
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const refreshToken = req.session?.user?.refreshToken;
        if (!refreshToken) {
            recordAuditEvent('token_refresh_blocked', {
                actorId: req.session?.user?.id || null,
                context: buildRequestContext(req),
                metadata: { reason: 'missing_refresh_token' }
            });
            return res.status(400).json({ error: 'Refresh token manquant' });
        }

        const newTokens = await ftRefreshAccessToken({
            clientId: franceTravailConfig.clientId,
            clientSecret: franceTravailConfig.clientSecret,
            redirectUri: franceTravailConfig.redirectUri
        }, refreshToken);

        req.session.user = {
            ...req.session.user,
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || refreshToken
        };

        recordAuditEvent('token_refresh_success', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req)
        });

        res.json({ success: true });
    } catch (error) {
        logger.error('Token refresh failed', { error: error.message });
        recordAuditEvent('token_refresh_failed', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req),
            metadata: { message: error.message }
        });
        res.status(500).json({ error: 'Impossible de rafraîchir le token' });
    }
});

// Validate stored access token
app.get('/api/auth/validate', async (req, res) => {
    try {
        const accessToken = req.session?.user?.accessToken;
        if (!accessToken) {
            recordAuditEvent('token_validate_blocked', {
                actorId: req.session?.user?.id || null,
                context: buildRequestContext(req),
                metadata: { reason: 'missing_access_token' }
            });
            return res.status(400).json({ valid: false, error: 'Access token manquant' });
        }

        const isValid = await ftValidateToken(accessToken);
        recordAuditEvent('token_validate_result', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req),
            metadata: { valid: isValid }
        });
        res.json({ valid: isValid });
    } catch (error) {
        logger.error('Token validation failed', { error: error.message });
        recordAuditEvent('token_validate_failed', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req),
            metadata: { message: error.message }
        });
        res.status(500).json({ error: 'Impossible de valider le token' });
    }
});

// Client-side telemetry endpoint
app.post('/api/telemetry/events', requireAuthenticatedSession, (req, res) => {
    const payload = req.body;

    if (!payload || (Array.isArray(payload) && payload.length === 0)) {
        recordAuditEvent('telemetry_payload_missing', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req)
        });
        return res.status(400).json({ error: 'Payload required' });
    }

    const estimatedBytes = Buffer.byteLength(JSON.stringify(payload));
    if (estimatedBytes > TELEMETRY_MAX_REQUEST_BYTES) {
        recordAuditEvent('telemetry_payload_rejected', {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req),
            metadata: { size: estimatedBytes, limit: TELEMETRY_MAX_REQUEST_BYTES }
        });
        return res.status(413).json({ error: 'Payload too large' });
    }

    const events = Array.isArray(payload)
        ? payload.slice(0, TELEMETRY_MAX_EVENTS_PER_REQUEST)
        : [payload];

    events.forEach((event) => {
        if (!event || typeof event !== 'object') {
            return;
        }

        const eventName = sanitizeTelemetryString(event.eventName) || 'client_event';
        const source = sanitizeTelemetryString(event.source) || 'client';
        const details = sanitizeTelemetryDetails(event.details || {});
        const metadata = {
            ...details,
            locale: sanitizeTelemetryString(event.locale || event.details?.locale),
            path: sanitizeTelemetryString(event.path || event.details?.path || req.headers.referer),
            component: sanitizeTelemetryString(event.component) || 'spa',
            severity: sanitizeTelemetryString(event.severity) || 'info'
        };

        recordAuditEvent(eventName, {
            actorId: req.session?.user?.id || null,
            context: buildRequestContext(req),
            metadata,
            source
        });
    });

    res.json({ success: true });
});

// Serve the SPA for any non-API GET route (required for Vercel rewrites and previews)
app.get('*', (req, res, next) => {
    if (req.method !== 'GET') {
        return next();
    }

    if (SPA_EXCLUDED_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
        return next();
    }

    res.sendFile(path.join(__dirname, 'index.html'));
});

// Sentry error handler must be before any other error middleware
if (Sentry) {
    app.use(Sentry.Handlers.errorHandler());
}

// Fallback handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    const server = app.listen(PORT, '0.0.0.0', () => {
        const address = server.address();
        const activePort = typeof address === 'object' && address ? address.port : PORT;
        console.log(`Serveur démarré sur le port ${activePort}`);
        console.log(`URL locale: http://localhost:${activePort}`);
        console.log(`Callback URL: ${franceTravailConfig.redirectUri}`);
    });

    const gracefulShutdown = (signal) => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        server.close(() => {
            closeRedisConnection()
                .catch((error) => logger.error('Error closing Redis during shutdown', { error: error.message }))
                .finally(() => process.exit(0));
        });
    };

    ['SIGTERM', 'SIGINT'].forEach((signal) => {
        process.on(signal, () => gracefulShutdown(signal));
    });
}

module.exports = app;
