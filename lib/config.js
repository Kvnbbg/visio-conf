const Joi = require('joi');
const { getSecret } = require('./secrets');
const logger = require('./logger');
const { FRANCETRAVAIL_AUTH_URL } = require('./franceTravailAuth');

const DEFAULT_ZEGO_APP_ID = 234470600;
const DEFAULT_ZEGO_SERVER_SECRET = 'db9a379cd5f3c8a4268f61a00cdd8600';

const schema = Joi.object({
    nodeEnv: Joi.string().valid('development', 'test', 'production').default('development'),
    port: Joi.number().integer().min(0).max(65535).default(3000),
    sessionSecret: Joi.string().min(16).default('demo_session_secret'),
    demoMode: Joi.boolean().truthy('true').falsy('false'),
    corsAllowedOrigins: Joi.string().allow('', null).default(''),
    rateLimitMax: Joi.number().integer().min(1).default(100),
    zegoAppId: Joi.alternatives().try(
        Joi.number().integer().positive(),
        Joi.string().allow('')
    ).default(DEFAULT_ZEGO_APP_ID),
    zegoServerSecret: Joi.string().min(8).default(DEFAULT_ZEGO_SERVER_SECRET),
    allowZegoClientFallback: Joi.boolean().truthy('true').falsy('false').default(true),
    zegoDefaultMode: Joi.string().valid('api', 'fallback').default('api'),
    franceTravailClientId: Joi.string().allow('').default('demo_client_id'),
    franceTravailClientSecret: Joi.string().allow('').default('demo_client_secret'),
    franceTravailRedirectUri: Joi.string().uri().default('http://localhost:3000/auth/francetravail/callback'),
    franceTravailAuthUrl: Joi.string().uri().default(FRANCETRAVAIL_AUTH_URL),
    googleClientId: Joi.string().allow('').default(''),
    googleClientSecret: Joi.string().allow('').default(''),
    redisUrl: Joi.string().uri({ scheme: ['redis', /rediss?/] }).allow('', null),
    sentryDsn: Joi.string().allow('', null),
    logLevel: Joi.string().default('info')
}).prefs({ abortEarly: false, convert: true, allowUnknown: true });

const parseOrigins = (value) => {
    if (!value) {
        return [];
    }

    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
};

const loadConfig = () => {
    const raw = {
        nodeEnv: process.env.NODE_ENV,
        port: process.env.PORT,
        sessionSecret: getSecret('SESSION_SECRET', 'demo_session_secret'),
        demoMode: process.env.DEMO_MODE,
        corsAllowedOrigins: process.env.CORS_ALLOWED_ORIGINS,
        rateLimitMax: process.env.RATE_LIMIT_MAX,
        zegoAppId: getSecret('ZEGOCLOUD_APP_ID', DEFAULT_ZEGO_APP_ID),
        zegoServerSecret: getSecret('ZEGOCLOUD_SERVER_SECRET', DEFAULT_ZEGO_SERVER_SECRET),
        allowZegoClientFallback: getSecret('ALLOW_ZEGO_CLIENT_FALLBACK', process.env.ALLOW_ZEGO_CLIENT_FALLBACK ?? 'true'),
        zegoDefaultMode: getSecret('ZEGOCLOUD_DEFAULT_MODE', process.env.ZEGOCLOUD_DEFAULT_MODE || 'api'),
        franceTravailClientId: process.env.FRANCETRAVAIL_CLIENT_ID,
        franceTravailClientSecret: process.env.FRANCETRAVAIL_CLIENT_SECRET,
        franceTravailRedirectUri: process.env.FRANCETRAVAIL_REDIRECT_URI,
        franceTravailAuthUrl: process.env.FRANCETRAVAIL_AUTH_URL,
        googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        redisUrl: process.env.REDIS_URL,
        sentryDsn: process.env.SENTRY_DSN,
        logLevel: process.env.LOG_LEVEL
    };

    const { value, error } = schema.validate(raw);

    if (error) {
        const details = error.details.map((detail) => detail.message).join(', ');
        const configError = new Error(`Invalid configuration: ${details}`);
        configError.name = 'ConfigurationError';
        throw configError;
    }

    const isProduction = value.nodeEnv === 'production';
    const hasFranceTravailCredentials = Boolean(
        value.franceTravailClientId &&
        value.franceTravailClientSecret &&
        value.franceTravailClientId !== 'demo_client_id'
    );
    const hasGoogleCredentials = Boolean(value.googleClientId && value.googleClientSecret);
    const isDemoMode = value.demoMode === true || (value.demoMode !== false && !hasFranceTravailCredentials);

    const parsedZegoAppId = Number(value.zegoAppId);
    const resolvedZegoAppId = Number.isFinite(parsedZegoAppId) && parsedZegoAppId > 0
        ? parsedZegoAppId
        : DEFAULT_ZEGO_APP_ID;

    if (!Number.isFinite(parsedZegoAppId) && value.zegoAppId) {
        logger.warn('ZEGOCLOUD_APP_ID is not numeric. Falling back to demo app ID.');
    }

    if (isProduction && value.sessionSecret === 'demo_session_secret') {
        logger.warn('SESSION_SECRET is using the demo default. Set a strong secret in production.');
    }

    if (isProduction && value.zegoServerSecret === DEFAULT_ZEGO_SERVER_SECRET) {
        logger.warn('ZEGOCLOUD_SERVER_SECRET is still using the demo default. Update it for production.');
    }

    return {
        nodeEnv: value.nodeEnv,
        port: value.port,
        isProduction,
        sessionSecret: value.sessionSecret,
        demoMode: isDemoMode,
        hasFranceTravailCredentials,
        corsAllowedOrigins: parseOrigins(value.corsAllowedOrigins),
        rateLimitMax: value.rateLimitMax,
        zego: {
            appId: resolvedZegoAppId,
            serverSecret: value.zegoServerSecret,
            allowClientFallback: value.allowZegoClientFallback,
            defaultMode: value.zegoDefaultMode
        },
        franceTravail: {
            clientId: value.franceTravailClientId || 'demo_client_id',
            clientSecret: value.franceTravailClientSecret || 'demo_client_secret',
            redirectUri: value.franceTravailRedirectUri || 'http://localhost:3000/auth/francetravail/callback',
            authUrl: value.franceTravailAuthUrl || FRANCETRAVAIL_AUTH_URL
        },
        google: {
            enabled: hasGoogleCredentials
        },
        redisUrl: value.redisUrl || null,
        sentryDsn: value.sentryDsn || null,
        logLevel: value.logLevel
    };
};

module.exports = {
    loadConfig,
    DEFAULT_ZEGO_APP_ID,
    DEFAULT_ZEGO_SERVER_SECRET
};
