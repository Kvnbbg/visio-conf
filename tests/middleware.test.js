const { 
    requireAuth, 
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
            ip: '127.0.0.1'
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            on: jest.fn()
        };
        next = jest.fn();
    });

    describe('requireAuth', () => {
        test('should call next() when user is authenticated', () => {
            req.session.user = { id: 'user123' };
            
            requireAuth(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should return 401 when user is not authenticated', () => {
            requireAuth(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Authentification requise',
                code: 'AUTH_REQUIRED'
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 401 when session is missing', () => {
            req.session = null;
            
            requireAuth(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('validateRequest', () => {
        test('should call next() when all required fields are present', () => {
            const middleware = validateRequest(['name', 'email']);
            req.body = { name: 'John', email: 'john@example.com' };
            
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should return 400 when required fields are missing', () => {
            const middleware = validateRequest(['name', 'email']);
            req.body = { name: 'John' };
            
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Champs requis manquants: email',
                code: 'MISSING_FIELDS',
                missingFields: ['email']
            });
            expect(next).not.toHaveBeenCalled();
        });

        test('should return 400 when fields are empty strings', () => {
            const middleware = validateRequest(['name']);
            req.body = { name: '   ' };
            
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(next).not.toHaveBeenCalled();
        });

        test('should handle multiple missing fields', () => {
            const middleware = validateRequest(['name', 'email', 'phone']);
            req.body = {};
            
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Champs requis manquants: name, email, phone',
                code: 'MISSING_FIELDS',
                missingFields: ['name', 'email', 'phone']
            });
        });
    });

    describe('errorHandler', () => {
        let consoleErrorSpy;

        beforeEach(() => {
            consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        });

        afterEach(() => {
            consoleErrorSpy.mockRestore();
        });

        test('should handle generic errors', () => {
            const error = new Error('Test error');
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Erreur interne du serveur',
                code: 'INTERNAL_ERROR',
                stack: error.stack
            });
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error occurred:', error);
        });

        test('should handle validation errors', () => {
            const error = new Error('Validation failed');
            error.name = 'ValidationError';
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Validation failed',
                code: 'VALIDATION_ERROR',
                stack: error.stack
            });
        });

        test('should handle unauthorized errors', () => {
            const error = new Error('Unauthorized');
            error.name = 'UnauthorizedError';
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Non autorisé',
                code: 'UNAUTHORIZED',
                stack: error.stack
            });
        });

        test('should handle connection errors', () => {
            const error = new Error('Connection refused');
            error.code = 'ECONNREFUSED';
            
            errorHandler(error, req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(503);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Service temporairement indisponible',
                code: 'SERVICE_UNAVAILABLE',
                stack: error.stack
            });
        });

        test('should hide stack trace in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            
            const error = new Error('Test error');
            
            errorHandler(error, req, res, next);
            
            expect(res.json).toHaveBeenCalledWith({
                error: 'Erreur interne du serveur',
                code: 'INTERNAL_ERROR'
            });
            
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('notFoundHandler', () => {
        test('should return 404 with path information', () => {
            req.path = '/unknown/path';
            
            notFoundHandler(req, res);
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Ressource non trouvée',
                code: 'NOT_FOUND',
                path: '/unknown/path'
            });
        });
    });

    describe('requestLogger', () => {
        let consoleLogSpy;

        beforeEach(() => {
            consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        });

        afterEach(() => {
            consoleLogSpy.mockRestore();
        });

        test('should log successful requests', () => {
            res.statusCode = 200;
            
            requestLogger(req, res, next);
            
            // Simulate response finish
            const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
            finishCallback();
            
            expect(next).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalledWith(
                expect.stringMatching(/\[.*\] GET \/test - 200 \(\d+ms\)/)
            );
        });

        test('should log error requests', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
            res.statusCode = 500;
            
            requestLogger(req, res, next);
            
            // Simulate response finish
            const finishCallback = res.on.mock.calls.find(call => call[0] === 'finish')[1];
            finishCallback();
            
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Error details: GET /test - Status: 500'
            );
            
            consoleErrorSpy.mockRestore();
        });
    });

    describe('rateLimit', () => {
        test('should allow requests within limit', () => {
            const middleware = rateLimit(5, 60000); // 5 requests per minute
            
            middleware(req, res, next);
            
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should block requests exceeding limit', () => {
            const middleware = rateLimit(2, 60000); // 2 requests per minute
            
            // Make 3 requests
            middleware(req, res, next);
            middleware(req, res, next);
            middleware(req, res, next);
            
            expect(res.status).toHaveBeenCalledWith(429);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Trop de requêtes. Veuillez réessayer plus tard.',
                code: 'RATE_LIMIT_EXCEEDED',
                retryAfter: 60
            });
        });

        test('should reset limit after time window', (done) => {
            const middleware = rateLimit(1, 100); // 1 request per 100ms
            
            // First request should pass
            middleware(req, res, next);
            expect(next).toHaveBeenCalledTimes(1);
            
            // Second request should be blocked
            middleware(req, res, next);
            expect(res.status).toHaveBeenCalledWith(429);
            
            // After time window, request should pass again
            setTimeout(() => {
                middleware(req, res, next);
                expect(next).toHaveBeenCalledTimes(2);
                done();
            }, 150);
        });

        test('should handle different client IPs separately', () => {
            const middleware = rateLimit(1, 60000);
            const req2 = { ...req, ip: '192.168.1.1' };
            const res2 = { ...res, status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
            const next2 = jest.fn();
            
            // First client makes request
            middleware(req, res, next);
            expect(next).toHaveBeenCalled();
            
            // Second client should also be allowed
            middleware(req2, res2, next2);
            expect(next2).toHaveBeenCalled();
            expect(res2.status).not.toHaveBeenCalled();
        });
    });
});