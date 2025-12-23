class AppError extends Error {
    constructor(message, options = {}) {
        const { statusCode = 500, code = 'INTERNAL_ERROR', details, isOperational = true, ...metadata } = options;
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;
        Object.assign(this, metadata);
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    AppError
};
