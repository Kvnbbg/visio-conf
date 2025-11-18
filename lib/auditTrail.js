const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const logsDir = path.join(__dirname, '..', 'logs');
const auditLogPath = path.join(logsDir, 'audit.log');

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

if (!fs.existsSync(auditLogPath)) {
    fs.writeFileSync(auditLogPath, '', 'utf8');
}

function buildRequestContext(req = {}) {
    return {
        ip: req.ip || null,
        method: req.method || null,
        path: req.originalUrl || req.url || null,
        userAgent: req.headers ? req.headers['user-agent'] : null,
        requestId: req.headers ? (req.headers['x-request-id'] || req.headers['x-correlation-id'] || null) : null
    };
}

function recordAuditEvent(eventType, {
    actorId = null,
    context = {},
    metadata = {},
    source = 'server'
} = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        eventType,
        actorId,
        source,
        context,
        metadata
    };

    const line = `${JSON.stringify(entry)}\n`;
    fs.appendFile(auditLogPath, line, (error) => {
        if (error) {
            logger.error('Failed to write audit event', { error: error.message, eventType });
        }
    });

    logger.info('Audit event recorded', entry);
}

module.exports = {
    buildRequestContext,
    recordAuditEvent
};
