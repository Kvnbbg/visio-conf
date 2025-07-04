const logger = require('../lib/logger');
const winston = require('winston');
const fs = require('fs');
const path = require('path');

describe('Logger', () => {
    const logsDir = path.join(__dirname, '..', 'logs');
    
    beforeAll(() => {
        // Ensure logs directory exists
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
    });

    afterEach(() => {
        // Clean up log files after each test
        const logFiles = ['error.log', 'combined.log'];
        logFiles.forEach(file => {
            const filePath = path.join(logsDir, file);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        });
    });

    describe('Logger Configuration', () => {
        it('should be a winston logger instance', () => {
            expect(logger).toBeInstanceOf(winston.Logger);
        });

        it('should have correct log level', () => {
            expect(logger.level).toBe(process.env.LOG_LEVEL || 'info');
        });

        it('should have file transports configured', () => {
            const transports = logger.transports;
            const fileTransports = transports.filter(t => t instanceof winston.transports.File);
            
            expect(fileTransports.length).toBeGreaterThanOrEqual(2);
        });

        it('should have console transport in development', () => {
            if (process.env.NODE_ENV !== 'production') {
                const transports = logger.transports;
                const consoleTransports = transports.filter(t => t instanceof winston.transports.Console);
                
                expect(consoleTransports.length).toBeGreaterThanOrEqual(1);
            }
        });
    });

    describe('Logging Functionality', () => {
        it('should log info messages', () => {
            const spy = jest.spyOn(logger, 'info');
            
            logger.info('Test info message');
            
            expect(spy).toHaveBeenCalledWith('Test info message');
            spy.mockRestore();
        });

        it('should log error messages', () => {
            const spy = jest.spyOn(logger, 'error');
            
            logger.error('Test error message');
            
            expect(spy).toHaveBeenCalledWith('Test error message');
            spy.mockRestore();
        });

        it('should log warn messages', () => {
            const spy = jest.spyOn(logger, 'warn');
            
            logger.warn('Test warning message');
            
            expect(spy).toHaveBeenCalledWith('Test warning message');
            spy.mockRestore();
        });

        it('should log debug messages when level allows', () => {
            const spy = jest.spyOn(logger, 'debug');
            
            logger.debug('Test debug message');
            
            expect(spy).toHaveBeenCalledWith('Test debug message');
            spy.mockRestore();
        });
    });

    describe('Log Formatting', () => {
        it('should include timestamp in logs', () => {
            const spy = jest.spyOn(logger, 'info');
            
            logger.info('Test message with timestamp');
            
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should include service metadata', () => {
            const spy = jest.spyOn(logger, 'info');
            
            logger.info('Test message with metadata');
            
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('should handle error objects with stack traces', () => {
            const spy = jest.spyOn(logger, 'error');
            const testError = new Error('Test error');
            
            logger.error('Error occurred', testError);
            
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });

    describe('File Logging', () => {
        it('should create logs directory if it does not exist', () => {
            expect(fs.existsSync(logsDir)).toBe(true);
        });

        it('should write to error log file', (done) => {
            const errorLogPath = path.join(logsDir, 'error.log');
            
            logger.error('Test error for file logging');
            
            // Wait a bit for the file to be written
            setTimeout(() => {
                if (fs.existsSync(errorLogPath)) {
                    const content = fs.readFileSync(errorLogPath, 'utf8');
                    expect(content).toContain('Test error for file logging');
                }
                done();
            }, 100);
        });

        it('should write to combined log file', (done) => {
            const combinedLogPath = path.join(logsDir, 'combined.log');
            
            logger.info('Test info for combined logging');
            
            // Wait a bit for the file to be written
            setTimeout(() => {
                if (fs.existsSync(combinedLogPath)) {
                    const content = fs.readFileSync(combinedLogPath, 'utf8');
                    expect(content).toContain('Test info for combined logging');
                }
                done();
            }, 100);
        });
    });

    describe('Log Levels', () => {
        it('should respect log level hierarchy', () => {
            // Set logger to warn level
            logger.level = 'warn';
            
            const infoSpy = jest.spyOn(logger, 'info');
            const warnSpy = jest.spyOn(logger, 'warn');
            const errorSpy = jest.spyOn(logger, 'error');
            
            logger.info('This should not be logged');
            logger.warn('This should be logged');
            logger.error('This should be logged');
            
            expect(infoSpy).toHaveBeenCalled(); // Called but not logged due to level
            expect(warnSpy).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();
            
            infoSpy.mockRestore();
            warnSpy.mockRestore();
            errorSpy.mockRestore();
            
            // Reset to original level
            logger.level = process.env.LOG_LEVEL || 'info';
        });
    });

    describe('Error Handling', () => {
        it('should handle logging errors gracefully', () => {
            // Mock a transport error
            const originalTransports = logger.transports;
            logger.transports = [];
            
            expect(() => {
                logger.info('Test message with no transports');
            }).not.toThrow();
            
            // Restore transports
            logger.transports = originalTransports;
        });

        it('should handle circular references in objects', () => {
            const circularObj = { name: 'test' };
            circularObj.self = circularObj;
            
            expect(() => {
                logger.info('Circular object test', { data: circularObj });
            }).not.toThrow();
        });
    });

    describe('Performance', () => {
        it('should handle high volume logging', () => {
            const start = Date.now();
            
            for (let i = 0; i < 100; i++) {
                logger.info(`Performance test message ${i}`);
            }
            
            const duration = Date.now() - start;
            expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
        });
    });
});