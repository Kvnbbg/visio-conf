const Redis = require('redis');
const logger = require('./logger');

let redisClient = null;

const createRedisClient = async () => {
    try {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

        redisClient = Redis.createClient({
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
        redisClient = null;
        return null;
    }
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
