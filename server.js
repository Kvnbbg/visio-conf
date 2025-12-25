const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const logger = require('./lib/logger');
const packageInfo = require('./package.json');
const { loadConfig } = require('./lib/config');

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
const {
    exchangeCodeForToken: ftExchangeCode,
    refreshAccessToken: ftRefreshAccessToken,
    getUserInfo: ftGetUserInfo,
    validateToken: ftValidateToken
} = require('./lib/franceTravailAuth');
const {
    requestId,
    requestLogger,
    errorHandler,
    notFoundHandler,
    rateLimit: createRateLimit,
    validateRequest
} = require('./lib/middleware');
const {
    ensureAuthSchema,
    getUserByEmail: getSqlUserByEmail,
    createUser: createSqlUser,
    recordLogin
} = require('./lib/simpleSqlAuth');
const {
    createRedisClient,
    closeRedisConnection
} = require('./lib/redis');
const bcrypt = require('bcrypt');
const { AppError } = require('./lib/errors');

const app = express();
const SPA_EXCLUDED_PREFIXES = ['/api', '/auth', '/health', '/locales'];
const INDEX_HTML_PATH = path.join(__dirname, 'public', 'index.html');

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
    console.log(`Visio-Conf ${packageInfo.version}\n`);
    console.log('Usage: node server.js [options]');
    console.log('\nOptions:');
    console.log('  -h, --help       Show this help output');
    console.log('  -v, --version    Print the current version');
    process.exit(0);
}

if (args.includes('--version') || args.includes('-v')) {
    console.log(packageInfo.version);
    process.exit(0);
}

const config = loadConfig();

// Optional Sentry instrumentation
let Sentry = null;
let Tracing = null;
if (config.sentryDsn) {
    try {
        Sentry = require('@sentry/node');
        Tracing = require('@sentry/tracing');

        Sentry.init({
            dsn: config.sentryDsn,
            integrations: [
                new Sentry.Integrations.Http({ tracing: true }),
                new Tracing.Integrations.Express({ app })
            ],
            tracesSampleRate: config.isProduction ? 0.1 : 1.0,
            environment: config.nodeEnv || 'development',
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

const isProduction = config.isProduction;
const hasFranceTravailCredentials = config.hasFranceTravailCredentials;
const isDemoMode = config.demoMode;
const MIN_PASSWORD_LENGTH = 8;

if (isDemoMode) {
    logger.warn('Application démarrée en mode démonstration. Utilisez DEMO_MODE=false en production.');
}

app.set('trust proxy', 1);

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

// Request context & logging
app.use(requestId);
app.use(requestLogger);

// Basic rate limiting for all API routes
const apiLimiter = createRateLimit(config.rateLimitMax, 15 * 60 * 1000);
app.use('/api/', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
// Attach simple translation helper for API errors
app.use((req, res, next) => {
    const languageHeader = req.headers['accept-language'];
    const preferred = typeof languageHeader === 'string' && languageHeader.toLowerCase().startsWith('en') ? 'en' : 'fr';
    const dictionary = {
        fr: {
            register_name_required: "Merci d'indiquer votre nom.",
            register_email_invalid: "Entrez une adresse email valide.",
            register_password_too_short: "Le mot de passe doit contenir au moins 8 caractères.",
            register_email_exists: "Un compte existe déjà avec cet email.",
            login_invalid: "Identifiants invalides. Réessayez.",
            auth_too_many_attempts: "Trop de tentatives. Veuillez patienter."
        },
        en: {
            register_name_required: 'Please add your name.',
            register_email_invalid: 'Enter a valid email address.',
            register_password_too_short: 'Password must be at least 8 characters.',
            register_email_exists: 'An account with this email already exists.',
            login_invalid: 'Invalid credentials. Please try again.',
            auth_too_many_attempts: 'Too many attempts. Please wait a moment.'
        }
    };

    req.t = (key) => dictionary[preferred]?.[key] || key;
    res.setHeader('Content-Language', preferred);
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (config.corsAllowedOrigins.length === 0 || config.corsAllowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Static assets with explicit headers for HTML to avoid unintended downloads
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.type('html');
            res.setHeader('Content-Disposition', 'inline');
            res.setHeader('Cache-Control', 'no-store');
        }
    }
}));

// Session configuration with optional Redis support
const sessionCookieSameSite = isProduction ? 'strict' : 'lax';
const baseSessionOptions = {
    secret: config.sessionSecret,
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

if (config.nodeEnv === 'test') {
    logger.info('Skipping Redis session store initialisation during tests');
} else {
    (async () => {
        try {
            const redisClient = await createRedisClient(config.redisUrl);
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

// Configuration constants & fallback strategies
const ZEGOCLOUD_APP_ID = Number(config.zego.appId) || config.zego.appId;
const ZEGOCLOUD_SERVER_SECRET = config.zego.serverSecret;
const allowZegoClientFallback = config.zego.allowClientFallback;
const defaultZegoMode = allowZegoClientFallback ? config.zego.defaultMode : 'api';
const FALLBACK_ZEGO_OPTIONS = {
    turnOnMicrophoneWhenJoining: true,
    turnOnCameraWhenJoining: true,
    showMyCameraToggleButton: true,
    showMyMicrophoneToggleButton: true,
    showAudioVideoSettingsButton: true,
    showScreenSharingButton: true,
    showTextChat: true,
    showUserList: true,
    maxUsers: 50,
    layout: 'Auto',
    showLayoutButton: true,
    scenario: {
        mode: 'VideoConference',
        config: {
            role: 'Host'
        }
    }
};

const franceTravailConfig = {
    clientId: config.franceTravail.clientId,
    clientSecret: config.franceTravail.clientSecret,
    redirectUri: config.franceTravail.redirectUri,
    authUrl: config.franceTravail.authUrl
};

const buildHealthPayload = () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv || 'development'
});

app.get('/api/config/client', (req, res) => {
    res.json({
        demoMode: isDemoMode,
        franceTravailEnabled: hasFranceTravailCredentials,
        zego: {
            appId: Number(ZEGOCLOUD_APP_ID) || null,
            allowClientFallback: allowZegoClientFallback,
            defaultMode: allowZegoClientFallback ? defaultZegoMode : 'api',
            options: FALLBACK_ZEGO_OPTIONS,
            serverSecret: allowZegoClientFallback ? ZEGOCLOUD_SERVER_SECRET : null
        }
    });
});

// Home route
app.get('/', (req, res) => {
    res.type('html');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store');

    res.sendFile(INDEX_HTML_PATH, (error) => {
        if (error) {
            logger.error('Failed to serve SPA index', { error: error.message, path: req.path });

            if (!res.headersSent) {
                res.status(error.statusCode || 500).send('Erreur lors du chargement de l\'application');
            }
        }
    });
});

// Health check endpoints
app.get('/health', (req, res) => {
    res.json(buildHealthPayload());
});

app.get('/api/health', (req, res) => {
    res.json(buildHealthPayload());
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
        return res.json({
            authenticated: true,
            user: req.session.user
        });
    }

    return res.json({ authenticated: false });
});

app.post('/api/auth/register', async (req, res, next) => {
    try {
        const { name, email, password } = req.body || {};
        const trimmedName = typeof name === 'string' ? name.trim() : '';
        const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!trimmedName) {
            throw new AppError('register_name_required', { statusCode: 400, code: 'NAME_REQUIRED' });
        }

        if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
            throw new AppError('register_email_invalid', { statusCode: 400, code: 'EMAIL_INVALID' });
        }

        if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
            throw new AppError('register_password_too_short', { statusCode: 400, code: 'PASSWORD_TOO_SHORT' });
        }

        await ensureAuthSchema();
        const existingUser = await getSqlUserByEmail(trimmedEmail);
        if (existingUser) {
            throw new AppError('register_email_exists', { statusCode: 409, code: 'EMAIL_EXISTS' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await createSqlUser({
            name: trimmedName,
            email: trimmedEmail,
            passwordHash
        });

        const sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            provider: 'password'
        };

        req.session.user = sessionUser;

        res.status(201).json({ success: true, user: sessionUser });
    } catch (error) {
        if (error.code === 'USER_EXISTS') {
            return next(new AppError('register_email_exists', { statusCode: 409, code: 'EMAIL_EXISTS' }));
        }
        return next(error);
    }
});

const authLimiter = createRateLimit(8, 10 * 60 * 1000);

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body || {};
        const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        if (!trimmedEmail || typeof password !== 'string') {
            throw new AppError('login_invalid', { statusCode: 401, code: 'INVALID_CREDENTIALS' });
        }

        await ensureAuthSchema();
        const user = await getSqlUserByEmail(trimmedEmail);
        if (!user) {
            throw new AppError('login_invalid', { statusCode: 401, code: 'INVALID_CREDENTIALS' });
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatch) {
            throw new AppError('login_invalid', { statusCode: 401, code: 'INVALID_CREDENTIALS' });
        }

        await recordLogin(user.id);

        const sessionUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            provider: 'password'
        };

        req.session.user = sessionUser;

        res.json({ success: true, user: sessionUser });
    } catch (error) {
        return next(error);
    }
});

// Initiate France Travail authentication
app.get('/auth/francetravail/login', (req, res) => {
    if (!hasFranceTravailCredentials) {
        return res.status(400).json({
            error: 'France Travail OAuth non configuré. Définissez FRANCETRAVAIL_CLIENT_ID/SECRET.',
            code: 'FT_OAUTH_NOT_CONFIGURED'
        });
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

        res.redirect(authUrl);
    } catch (error) {
        logger.error('Failed to initiate France Travail authentication', { error: error.message });
        res.status(500).json({ error: "Erreur lors de l'initiation de l'authentification" });
    }
});

// OAuth callback handler
app.get('/auth/francetravail/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            logger.error('OAuth returned an error', { error });
            return res.redirect('/?error=oauth_error');
        }

        if (!validateState(state, req.session.oauthState)) {
            logger.warn('Invalid OAuth state detected');
            return res.redirect('/?error=invalid_state');
        }

        if (!code) {
            logger.error('Missing authorization code in callback');
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

        res.redirect('/?auth=success');
    } catch (callbackError) {
        logger.error('OAuth callback processing failed', { error: callbackError.message });
        res.redirect('/?error=callback_error');
    }
});

// Optional demo login endpoint
app.post('/api/auth/demo-login', (req, res) => {
    if (!isDemoMode) {
        return res.status(404).json({ error: 'Route non disponible' });
    }

    const now = Date.now();
    const demoUser = {
        id: `demo_${now}`,
        name: req.body?.name?.trim() || 'Utilisateur Démo',
        email: req.body?.email?.trim() || 'demo@visio-conf.local',
        accessToken: 'demo_token',
        refreshToken: 'demo_refresh_token'
    };

    req.session.user = demoUser;

    res.json({ success: true, user: demoUser });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    if (!req.session) {
        return res.json({ success: true });
    }

    req.session.destroy((error) => {
        if (error) {
            logger.error('Session destruction failed', { error: error.message });
            return res.status(500).json({ error: 'Erreur lors de la déconnexion' });
        }
        res.json({ success: true });
    });
});

// Generate ZEGOCLOUD token endpoint
app.post('/api/generate-token',
    validateRequest(['roomID', 'userID']),
    (req, res) => {
        const { roomID, userID } = req.body || {};

        const validation = validateTokenParams(roomID, userID);
        if (!validation.isValid) {
            return res.status(400).json({ error: validation.error });
        }

        const isAuthenticated = Boolean(req.session?.user);
        if (!isAuthenticated && !isDemoMode) {
            return res.status(401).json({
                error: 'Authentification requise. Connectez-vous via France Travail.',
                code: 'AUTH_REQUIRED'
            });
        }

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
        } catch (error) {
            logger.error('Token generation failed', { error: error.message });
            res.status(500).json({ error: 'Erreur lors de la génération du token' });
        }
    }
);

// Refresh France Travail access token
app.post('/api/auth/refresh', async (req, res) => {
    try {
        const refreshToken = req.session?.user?.refreshToken;
        if (!refreshToken) {
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

        res.json({ success: true });
    } catch (error) {
        logger.error('Token refresh failed', { error: error.message });
        res.status(500).json({ error: 'Impossible de rafraîchir le token' });
    }
});

// Validate stored access token
app.get('/api/auth/validate', async (req, res) => {
    try {
        const accessToken = req.session?.user?.accessToken;
        if (!accessToken) {
            return res.status(400).json({ valid: false, error: 'Access token manquant' });
        }

        const isValid = await ftValidateToken(accessToken);
        res.json({ valid: isValid });
    } catch (error) {
        logger.error('Token validation failed', { error: error.message });
        res.status(500).json({ error: 'Impossible de valider le token' });
    }
});

// Serve the SPA for any non-API GET route (required for Vercel rewrites and previews)
app.get('*', (req, res, next) => {
    if (req.method !== 'GET') {
        return next();
    }

    if (SPA_EXCLUDED_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
        return next();
    }

    res.type('html');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'no-store');

    res.sendFile(INDEX_HTML_PATH, (error) => {
        if (error) {
            logger.error('Failed to serve SPA index', { error: error.message, path: req.path });

            if (!res.headersSent) {
                res.status(error.statusCode || 500).send('Erreur lors du chargement de l\'application');
            }
        }
    });
});

// Sentry error handler must be before any other error middleware
if (Sentry) {
    app.use(Sentry.Handlers.errorHandler());
}

// Fallback handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port;

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
