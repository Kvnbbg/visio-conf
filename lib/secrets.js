const fs = require('fs');
const path = require('path');
const logger = require('./logger');

let cachedSecrets = null;

function loadSecrets() {
    if (cachedSecrets) {
        return cachedSecrets;
    }

    const secretsPath = path.join(__dirname, '..', '.secrets');
    try {
        const contents = fs.readFileSync(secretsPath, 'utf8');
        cachedSecrets = JSON.parse(contents);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            logger.warn('Unable to read .secrets file', { error: error.message });
        }
        cachedSecrets = {};
    }

    return cachedSecrets;
}

function getSecret(key, fallback = undefined) {
    if (process.env[key]) {
        return process.env[key];
    }

    const secrets = loadSecrets();
    if (Object.prototype.hasOwnProperty.call(secrets, key)) {
        return secrets[key];
    }

    return fallback;
}

function refreshSecretsCache() {
    cachedSecrets = null;
    return loadSecrets();
}

module.exports = {
    loadSecrets,
    getSecret,
    refreshSecretsCache
};
