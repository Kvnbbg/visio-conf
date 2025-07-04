const Redis = require('redis');
const logger = require('./logger');

let redisClient = null;

const createRedisClient = async () => {
    try {
        // Use Redis URL from environment or default to localhost
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        
        redisClient = Redis.createClient({
            url: redisUrl,
            retry_strategy: (options) => {
                if (options.error && options.error.code === 'ECONNREFUSED') {
                    logger.error('Redis connection refused');
                    return new Error('Redis connection refused');
                }
                if (options.total_retry_time > 1000 * 60 * 60) {
                    logger.error('Redis retry time exhausted');
                    return new Error('Retry time exhausted');
                }
                if (options.attempt > 10) {
                    logger.error('Redis max retry attempts reached');
                    return undefined;
                }
                // Reconnect after
                return Math.min(options.attempt * 100, 3000);
            }
        });

        redisClient.on('error', (err) => {
            logger.error('Redis Client Error:', err);
        });

        redisClient.on('connect', () => {
            logger.info('Redis client connected');
        });

        redisClient.on('ready', () => {
            logger.info('Redis client ready');
        });

        redisClient.on('end', () => {
            logger.info('Redis client disconnected');
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        logger.error('Failed to create Redis client:', error);
        // Return null if Redis is not available (fallback to memory sessions)
        return null;
    }
};

const getRedisClient = () => {
    return redisClient;
};

const closeRedisConnection = async () => {
    if (redisClient) {
        try {
            await redisClient.quit();
            logger.info('Redis connection closed');
        } catch (error) {
            logger.error('Error closing Redis connection:', error);
        }
    }
};

module.exports = {
    createRedisClient,
    getRedisClient,
    closeRedisConnection
};