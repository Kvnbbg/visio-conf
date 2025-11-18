jest.mock('redis', () => ({
    createClient: jest.fn()
}));

describe('Redis Client', () => {
    let createRedisClient;
    let getRedisClient;
    let closeRedisConnection;
    let Redis;
    let mockRedisClient;
    let originalNodeEnv;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        Redis = require('redis');
        mockRedisClient = {
            connect: jest.fn().mockResolvedValue(),
            quit: jest.fn(),
            on: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        };
        Redis.createClient.mockReturnValue(mockRedisClient);

        ({ createRedisClient, getRedisClient, closeRedisConnection } = require('../lib/redis'));

        originalNodeEnv = process.env.NODE_ENV;
        process.env.REDIS_URL = 'redis://localhost:6379';
    });

    afterEach(() => {
        delete process.env.REDIS_URL;
        process.env.NODE_ENV = originalNodeEnv;
    });

    describe('createRedisClient', () => {
        it('should create Redis client with provided URL', async () => {
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
        });

        it('should handle connection errors gracefully', async () => {
            mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));

            const client = await createRedisClient();

            expect(client).toBeNull();
        });

        it('should set up event listeners', async () => {
            await createRedisClient();

            ['error', 'connect', 'ready', 'end'].forEach((event) => {
                expect(mockRedisClient.on).toHaveBeenCalledWith(event, expect.any(Function));
            });
        });
    });

    describe('getRedisClient', () => {
        it('should return the current Redis client', async () => {
            await createRedisClient();

            expect(getRedisClient()).toBe(mockRedisClient);
        });

        it('should return null if no client is set', () => {
            jest.resetModules();
            const { getRedisClient: freshGetClient } = require('../lib/redis');

            expect(freshGetClient()).toBeNull();
        });
    });

    describe('closeRedisConnection', () => {
        it('should close Redis connection gracefully', async () => {
            mockRedisClient.quit.mockResolvedValue();

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
            jest.resetModules();
            const { closeRedisConnection: freshCloseConnection } = require('../lib/redis');

            await expect(freshCloseConnection()).resolves.not.toThrow();
        });
    });

    describe('Reconnect strategy', () => {
        const getStrategy = async () => {
            await createRedisClient();
            const call = Redis.createClient.mock.calls[Redis.createClient.mock.calls.length - 1][0];
            return call.socket.reconnectStrategy;
        };

        it('should back off with incremental delay', async () => {
            const strategy = await getStrategy();

            expect(strategy(1)).toBe(100);
            expect(strategy(10)).toBe(1000);
        });

        it('should stop retrying after max attempts', async () => {
            const strategy = await getStrategy();

            const result = strategy(11);

            expect(result).toBeInstanceOf(Error);
            expect(result.message).toBe('Retry time exhausted');
        });
    });

    describe('Event Handlers', () => {
        const findHandler = (event, calls) => calls.find(call => call[0] === event)?.[1];

        it('should handle error events', async () => {
            await createRedisClient();

            const handler = findHandler('error', mockRedisClient.on.mock.calls);
            expect(() => handler(new Error('Test error'))).not.toThrow();
        });

        it('should handle connect events', async () => {
            await createRedisClient();

            const handler = findHandler('connect', mockRedisClient.on.mock.calls);
            expect(() => handler()).not.toThrow();
        });

        it('should handle ready events', async () => {
            await createRedisClient();

            const handler = findHandler('ready', mockRedisClient.on.mock.calls);
            expect(() => handler()).not.toThrow();
        });

        it('should handle end events', async () => {
            await createRedisClient();

            const handler = findHandler('end', mockRedisClient.on.mock.calls);
            expect(() => handler()).not.toThrow();
        });
    });

    describe('Environment Configuration', () => {
        it('should use REDIS_URL from environment', async () => {
            process.env.REDIS_URL = 'redis://production:6379';

            await createRedisClient();

            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://production:6379',
                socket: { reconnectStrategy: expect.any(Function) }
            });
        });

        it('should fall back to default URL in development when environment variable is not set', async () => {
            delete process.env.REDIS_URL;
            process.env.NODE_ENV = 'development';

            await createRedisClient();

            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://localhost:6379',
                socket: { reconnectStrategy: expect.any(Function) }
            });
        });

        it('should skip client creation when no configuration is available', async () => {
            delete process.env.REDIS_URL;
            process.env.NODE_ENV = 'test';

            const client = await createRedisClient();

            expect(client).toBeNull();
            expect(Redis.createClient).not.toHaveBeenCalled();
        });
    });
});
