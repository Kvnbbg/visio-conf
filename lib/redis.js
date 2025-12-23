const Redis = require('redis');
const logger = require('./logger');

let redisClient = null;
let redisConnectionPromise = null;

const resolveRedisUrl = (explicitUrl) => {
    if (explicitUrl) {
        return explicitUrl;
    }

    if (process.env.REDIS_URL) {
        return process.env.REDIS_URL;
    }

    if (process.env.NODE_ENV !== 'production') {
        return 'redis://localhost:6379';
    }

    return null;
};

const createRedisClient = async (redisUrlOverride) => {
    const redisUrl = resolveRedisUrl(redisUrlOverride);

    if (!redisUrl) {
        logger.info('REDIS_URL not provided – using in-memory sessions');
        return null;
    }

    if (redisClient) {
        return redisClient;
    }

    if (redisConnectionPromise) {
        return redisConnectionPromise;
    }

    logger.info(`Initialising Redis client at ${redisUrl}`);

    const client = Redis.createClient({
        url: redisUrl,
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 10) {
                    logger.error('Redis max retry attempts reached');
                    return new Error('Retry time exhausted');
                }

                return Math.min(retries * 100, 3000);
            }
        }
    });

    client.on('error', (err) => {
        logger.error('Redis Client Error:', err);
    });

    client.on('connect', () => {
        logger.info('Redis client connected');
    });

    client.on('ready', () => {
        logger.info('Redis client ready');
    });

    client.on('end', () => {
        logger.info('Redis client disconnected');
    });

    redisConnectionPromise = client.connect()
        .then(() => {
            redisClient = client;
            return redisClient;
        })
        .catch((error) => {
            logger.error('Failed to create Redis client:', error);
            return null;
        })
        .finally(() => {
            redisConnectionPromise = null;
        });

    return redisConnectionPromise;
};

const getRedisClient = () => redisClient;

const closeRedisConnection = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        } finally {
            redisClient = null;
        }
    }
};

module.exports = {
    createRedisClient,
    getRedisClient,
    closeRedisConnection
};
