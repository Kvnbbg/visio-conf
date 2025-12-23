// Mock Redis
jest.mock('redis', () => ({
    createClient: jest.fn()
}));

const Redis = require('redis');
const { createRedisClient, getRedisClient, closeRedisConnection } = require('../lib/redis');

describe('Redis Client', () => {
    let mockRedisClient;

    beforeEach(async () => {
        jest.clearAllMocks();
        await closeRedisConnection();

        mockRedisClient = {
            connect: jest.fn().mockResolvedValue(),
            quit: jest.fn().mockResolvedValue(),
            on: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        };

        Redis.createClient.mockReturnValue(mockRedisClient);
    });

    describe('createRedisClient', () => {
        it('should create Redis client with default URL', async () => {
            const client = await createRedisClient();

            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://localhost:6379',
                socket: { reconnectStrategy: expect.any(Function) }
            });
            expect(mockRedisClient.connect).toHaveBeenCalled();
            expect(client).toBe(mockRedisClient);
        });

        it('should create Redis client with custom URL from environment', async () => {
            process.env.REDIS_URL = 'redis://custom:6379';

            const client = await createRedisClient();

            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://custom:6379',
                socket: { reconnectStrategy: expect.any(Function) }
            });
            expect(client).toBe(mockRedisClient);

            delete process.env.REDIS_URL;
        });

        it('should handle connection errors gracefully', async () => {
            mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

            const client = await createRedisClient();

            expect(client).toBeNull();
        });

        it('should set up event listeners', async () => {
            await createRedisClient();

            expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
        });
    });

    describe('getRedisClient', () => {
        it('should return the current Redis client', async () => {
            await createRedisClient();

            const client = getRedisClient();
            expect(client).toBe(mockRedisClient);
        });

        it('should return null if no client is set', () => {
            const client = getRedisClient();
            expect(client).toBeNull();
        });
    });

    describe('closeRedisConnection', () => {
        it('should close Redis connection gracefully', async () => {
            await createRedisClient();

            await closeRedisConnection();

            expect(mockRedisClient.quit).toHaveBeenCalled();
        });

        it('should handle close errors gracefully', async () => {
            mockRedisClient.quit.mockRejectedValue(new Error('Close failed'));
            await createRedisClient();

            await expect(closeRedisConnection()).resolves.not.toThrow();
        });

        it('should handle case when no client exists', async () => {
            await expect(closeRedisConnection()).resolves.not.toThrow();
        });
    });

    describe('Retry Strategy', () => {
        it('should stop retrying after max attempts', async () => {
            await createRedisClient();
            const retryStrategy = Redis.createClient.mock.calls[0]?.[0]?.socket?.reconnectStrategy;

            if (retryStrategy) {
                const result = retryStrategy(11);
                expect(result).toBeInstanceOf(Error);
                expect(result.message).toBe('Retry time exhausted');
            }
        });

        it('should return delay for valid retry attempts', async () => {
            await createRedisClient();
            const retryStrategy = Redis.createClient.mock.calls[0]?.[0]?.socket?.reconnectStrategy;

            if (retryStrategy) {
                const result = retryStrategy(3);
                expect(typeof result).toBe('number');
                expect(result).toBeGreaterThan(0);
                expect(result).toBeLessThanOrEqual(3000);
            }
        });
    });

    describe('Event Handlers', () => {
        it('should handle error events', async () => {
            await createRedisClient();

            const errorHandler = mockRedisClient.on.mock.calls.find(
                (call) => call[0] === 'error'
            )?.[1];

            if (errorHandler) {
                expect(() => errorHandler(new Error('Test error'))).not.toThrow();
            }
        });

        it('should handle connect events', async () => {
            await createRedisClient();

            const connectHandler = mockRedisClient.on.mock.calls.find(
                (call) => call[0] === 'connect'
            )?.[1];

            if (connectHandler) {
                expect(() => connectHandler()).not.toThrow();
            }
        });

        it('should handle ready events', async () => {
            await createRedisClient();

            const readyHandler = mockRedisClient.on.mock.calls.find(
                (call) => call[0] === 'ready'
            )?.[1];

            if (readyHandler) {
                expect(() => readyHandler()).not.toThrow();
            }
        });

        it('should handle end events', async () => {
            await createRedisClient();

            const endHandler = mockRedisClient.on.mock.calls.find(
                (call) => call[0] === 'end'
            )?.[1];

            if (endHandler) {
                expect(() => endHandler()).not.toThrow();
            }
        });
    });

    describe('Environment Configuration', () => {
        it('should use REDIS_URL from environment', async () => {
            const customUrl = 'redis://production:6379';
            process.env.REDIS_URL = customUrl;

            await createRedisClient();

            expect(Redis.createClient).toHaveBeenCalledWith({
                url: customUrl,
                socket: { reconnectStrategy: expect.any(Function) }
            });

            delete process.env.REDIS_URL;
        });

        it('should fall back to default URL when environment variable is not set', async () => {
            delete process.env.REDIS_URL;

            await createRedisClient();

            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://localhost:6379',
                socket: { reconnectStrategy: expect.any(Function) }
            });
        });
    });
});
