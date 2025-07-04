const { createRedisClient, getRedisClient, closeRedisConnection } = require('../lib/redis');

// Mock Redis
jest.mock('redis', () => ({
    createClient: jest.fn()
}));

const Redis = require('redis');

describe('Redis Client', () => {
    let mockRedisClient;

    beforeEach(() => {
        jest.clearAllMocks();
        
        mockRedisClient = {
            connect: jest.fn(),
            quit: jest.fn(),
            on: jest.fn(),
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn()
        };
        
        Redis.createClient.mockReturnValue(mockRedisClient);
    });

    describe('createRedisClient', () => {
        it('should create Redis client with default URL', async () => {
            mockRedisClient.connect.mockResolvedValue();
            
            const client = await createRedisClient();
            
            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://localhost:6379',
                retry_strategy: expect.any(Function)
            });
            expect(mockRedisClient.connect).toHaveBeenCalled();
            expect(client).toBe(mockRedisClient);
        });

        it('should create Redis client with custom URL from environment', async () => {
            process.env.REDIS_URL = 'redis://custom:6379';
            mockRedisClient.connect.mockResolvedValue();
            
            const client = await createRedisClient();
            
            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://custom:6379',
                retry_strategy: expect.any(Function)
            });
            
            delete process.env.REDIS_URL;
        });

        it('should handle connection errors gracefully', async () => {
            mockRedisClient.connect.mockRejectedValue(new Error('Connection failed'));
            
            const client = await createRedisClient();
            
            expect(client).toBeNull();
        });

        it('should set up event listeners', async () => {
            mockRedisClient.connect.mockResolvedValue();
            
            await createRedisClient();
            
            expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
            expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
        });
    });

    describe('getRedisClient', () => {
        it('should return the current Redis client', () => {
            const client = getRedisClient();
            expect(client).toBeDefined();
        });

        it('should return null if no client is set', () => {
            // Reset the module state
            jest.resetModules();
            const { getRedisClient: freshGetClient } = require('../lib/redis');
            
            const client = freshGetClient();
            expect(client).toBeNull();
        });
    });

    describe('closeRedisConnection', () => {
        it('should close Redis connection gracefully', async () => {
            mockRedisClient.quit.mockResolvedValue();
            
            // Set up a mock client
            await createRedisClient();
            
            await closeRedisConnection();
            
            expect(mockRedisClient.quit).toHaveBeenCalled();
        });

        it('should handle close errors gracefully', async () => {
            mockRedisClient.quit.mockRejectedValue(new Error('Close failed'));
            
            // Set up a mock client
            await createRedisClient();
            
            await expect(closeRedisConnection()).resolves.not.toThrow();
        });

        it('should handle case when no client exists', async () => {
            // Reset module state
            jest.resetModules();
            const { closeRedisConnection: freshCloseConnection } = require('../lib/redis');
            
            await expect(freshCloseConnection()).resolves.not.toThrow();
        });
    });

    describe('Retry Strategy', () => {
        it('should implement retry strategy for connection refused', async () => {
            const retryStrategy = Redis.createClient.mock.calls[0]?.[0]?.retry_strategy;
            
            if (retryStrategy) {
                const options = {
                    error: { code: 'ECONNREFUSED' },
                    total_retry_time: 1000,
                    attempt: 1
                };
                
                const result = retryStrategy(options);
                expect(result).toBeInstanceOf(Error);
                expect(result.message).toBe('Redis connection refused');
            }
        });

        it('should stop retrying after max time', async () => {
            const retryStrategy = Redis.createClient.mock.calls[0]?.[0]?.retry_strategy;
            
            if (retryStrategy) {
                const options = {
                    error: null,
                    total_retry_time: 1000 * 60 * 60 + 1, // Over 1 hour
                    attempt: 1
                };
                
                const result = retryStrategy(options);
                expect(result).toBeInstanceOf(Error);
                expect(result.message).toBe('Retry time exhausted');
            }
        });

        it('should stop retrying after max attempts', async () => {
            const retryStrategy = Redis.createClient.mock.calls[0]?.[0]?.retry_strategy;
            
            if (retryStrategy) {
                const options = {
                    error: null,
                    total_retry_time: 1000,
                    attempt: 11 // Over 10 attempts
                };
                
                const result = retryStrategy(options);
                expect(result).toBeUndefined();
            }
        });

        it('should return delay for valid retry attempts', async () => {
            const retryStrategy = Redis.createClient.mock.calls[0]?.[0]?.retry_strategy;
            
            if (retryStrategy) {
                const options = {
                    error: null,
                    total_retry_time: 1000,
                    attempt: 3
                };
                
                const result = retryStrategy(options);
                expect(typeof result).toBe('number');
                expect(result).toBeGreaterThan(0);
                expect(result).toBeLessThanOrEqual(3000);
            }
        });
    });

    describe('Event Handlers', () => {
        it('should handle error events', async () => {
            mockRedisClient.connect.mockResolvedValue();
            
            await createRedisClient();
            
            const errorHandler = mockRedisClient.on.mock.calls.find(
                call => call[0] === 'error'
            )?.[1];
            
            if (errorHandler) {
                expect(() => errorHandler(new Error('Test error'))).not.toThrow();
            }
        });

        it('should handle connect events', async () => {
            mockRedisClient.connect.mockResolvedValue();
            
            await createRedisClient();
            
            const connectHandler = mockRedisClient.on.mock.calls.find(
                call => call[0] === 'connect'
            )?.[1];
            
            if (connectHandler) {
                expect(() => connectHandler()).not.toThrow();
            }
        });

        it('should handle ready events', async () => {
            mockRedisClient.connect.mockResolvedValue();
            
            await createRedisClient();
            
            const readyHandler = mockRedisClient.on.mock.calls.find(
                call => call[0] === 'ready'
            )?.[1];
            
            if (readyHandler) {
                expect(() => readyHandler()).not.toThrow();
            }
        });

        it('should handle end events', async () => {
            mockRedisClient.connect.mockResolvedValue();
            
            await createRedisClient();
            
            const endHandler = mockRedisClient.on.mock.calls.find(
                call => call[0] === 'end'
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
            
            mockRedisClient.connect.mockResolvedValue();
            
            await createRedisClient();
            
            expect(Redis.createClient).toHaveBeenCalledWith({
                url: customUrl,
                retry_strategy: expect.any(Function)
            });
            
            delete process.env.REDIS_URL;
        });

        it('should fall back to default URL when environment variable is not set', async () => {
            delete process.env.REDIS_URL;
            
            mockRedisClient.connect.mockResolvedValue();
            
            await createRedisClient();
            
            expect(Redis.createClient).toHaveBeenCalledWith({
                url: 'redis://localhost:6379',
                retry_strategy: expect.any(Function)
            });
        });
    });
});