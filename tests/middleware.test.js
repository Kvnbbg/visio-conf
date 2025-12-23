jest.mock('../lib/logger', () => ({
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
}));

const logger = require('../lib/logger');
const {
    requireAuth,
    requestId,
    validateRequest,
    errorHandler,
    notFoundHandler,
    requestLogger,
    rateLimit
} = require('../lib/middleware');

describe('Middleware Module', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            session: {},
            body: {},
            path: '/test',
            method: 'GET',
            ip: '127.0.0.1',
            headers: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            on: jest.fn(),
            setHeader: jest.fn()
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('requireAuth', () => {
        test('should call next() when user is authenticated', () => {
            req.session.user = { id: 'user123' };

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should return 401 when user is not authenticated', () => {
            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            const error = next.mock.calls[0][0];
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('AUTH_REQUIRED');
        });

        test('should return 401 when session is missing', () => {
            req.session = null;

            requireAuth(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('requestId', () => {
        test('should set requestId and response header', () => {
            requestId(req, res, next);

            expect(req.requestId).toBeDefined();
            expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.requestId);
            expect(next).toHaveBeenCalled();
        });

        test('should reuse incoming request id', () => {
            req.headers['x-request-id'] = 'incoming-id';

            requestId(req, res, next);

            expect(req.requestId).toBe('incoming-id');
        });
    });

    describe('validateRequest', () => {
        test('should call next() when all required fields are present', () => {
            const middleware = validateRequest(['name', 'email']);
            req.body = { name: 'John', email: 'john@example.com' };

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith();
        });

        test('should return 400 when required fields are missing', () => {
            const middleware = validateRequest(['name', 'email']);
            req.body = { name: 'John' };

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
            const error = next.mock.calls[0][0];
            expect(error.statusCode).toBe(400);
            expect(error.details).toEqual({ missingFields: ['email'] });
        });

        test('should return 400 when fields are empty strings', () => {
            const middleware = validateRequest(['name']);
            req.body = { name: '   ' };

            middleware(req, res, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });

        test('should handle multiple missing fields', () => {
            const middleware = validateRequest(['name', 'email', 'phone']);
            req.body = {};

            middleware(req, res, next);

            const error = next.mock.calls[0][0];
            expect(error.details).toEqual({ missingFields: ['name', 'email', 'phone'] });
        });
    });

    describe('errorHandler', () => {
        test('should handle generic errors', () => {
            const error = new Error('Test error');
            req.requestId = 'req-1';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Test error',
                code: 'INTERNAL_ERROR',
                requestId: 'req-1',
                stack: error.stack
            }));
            expect(logger.error).toHaveBeenCalled();
        });

        test('should handle validation errors', () => {
            const error = new Error('Validation failed');
            error.name = 'ValidationError';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Validation failed',
                code: 'VALIDATION_ERROR'
            }));
        });

        test('should handle unauthorized errors', () => {
            const error = new Error('Unauthorized');
            error.name = 'UnauthorizedError';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Non autorisé',
                code: 'UNAUTHORIZED'
            }));
        });

        test('should handle connection errors', () => {
            const error = new Error('Connection refused');
            error.code = 'ECONNREFUSED';

            errorHandler(error, req, res, next);

            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Service temporairement indisponible',
                code: 'SERVICE_UNAVAILABLE'
            }));
        });

        test('should hide stack trace in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Test error');

            errorHandler(error, req, res, next);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: 'Erreur interne du serveur',
                code: 'INTERNAL_ERROR'
            }));
            const payload = res.json.mock.calls[0][0];
            expect(payload.stack).toBeUndefined();

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('notFoundHandler', () => {
        test('should return 404 with path information', () => {
            req.path = '/unknown/path';

            notFoundHandler(req, res, next);

            const error = next.mock.calls[0][0];
            expect(error.statusCode).toBe(404);
            expect(error.details).toEqual({ path: '/unknown/path' });
        });
    });

    describe('requestLogger', () => {
        test('should log successful requests', () => {
            res.statusCode = 200;
            req.originalUrl = '/test';

            requestLogger(req, res, next);

            const finishCallback = res.on.mock.calls.find((call) => call[0] === 'finish')[1];
            finishCallback();

            expect(next).toHaveBeenCalled();
            expect(logger.log).toHaveBeenCalledWith(expect.objectContaining({
                level: 'info',
                message: 'GET /test',
                statusCode: 200
            }));
        });

        test('should log error requests', () => {
            res.statusCode = 500;
            req.originalUrl = '/test';

            requestLogger(req, res, next);

            const finishCallback = res.on.mock.calls.find((call) => call[0] === 'finish')[1];
            finishCallback();

            expect(logger.log).toHaveBeenCalledWith(expect.objectContaining({
                level: 'error',
                statusCode: 500
            }));
        });
    });

    describe('rateLimit', () => {
        test('should allow requests within limit', () => {
            const middleware = rateLimit(5, 60000);

            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test('should block requests exceeding limit', () => {
            const middleware = rateLimit(2, 60000);

            middleware(req, res, next);
            middleware(req, res, next);
            middleware(req, res, next);

            const error = next.mock.calls[2][0];
            expect(error.statusCode).toBe(429);
            expect(error.retryAfter).toBe(60);
        });

        test('should reset limit after time window', (done) => {
            const middleware = rateLimit(1, 100);

            middleware(req, res, next);
            middleware(req, res, next);

            setTimeout(() => {
                middleware(req, res, next);
                expect(next).toHaveBeenCalledTimes(3);
                done();
            }, 150);
        });

        test('should handle different client IPs separately', () => {
            const middleware = rateLimit(1, 60000);
            const req2 = { ...req, ip: '192.168.1.1' };
            const res2 = { ...res, status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
            const next2 = jest.fn();

            middleware(req, res, next);
            middleware(req2, res2, next2);

            expect(next).toHaveBeenCalled();
            expect(next2).toHaveBeenCalled();
        });
    });
});
