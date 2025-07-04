const crypto = require('crypto');
const axios = require('axios');

/**
 * Generates PKCE code verifier and challenge for OAuth 2.0
 * @returns {Object} Object containing codeVerifier and codeChallenge
 */
function generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}

/**
 * Generates a secure random state for OAuth 2.0
 * @returns {string} Random state string
 */
function generateState() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Builds France Travail authorization URL
 * @param {Object} config - Configuration object
 * @param {string} config.clientId - France Travail client ID
 * @param {string} config.redirectUri - Redirect URI
 * @param {string} config.authUrl - Authorization URL
 * @param {string} state - OAuth state parameter
 * @param {string} codeChallenge - PKCE code challenge
 * @returns {string} Authorization URL
 */
function buildAuthUrl(config, state, codeChallenge) {
    const authUrl = new URL(config.authUrl);
    authUrl.searchParams.append('client_id', config.clientId);
    authUrl.searchParams.append('redirect_uri', config.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid profile');
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    
    return authUrl.toString();
}

/**
 * Exchanges authorization code for access token
 * @param {Object} config - Configuration object
 * @param {string} code - Authorization code
 * @param {string} codeVerifier - PKCE code verifier
 * @returns {Promise<Object>} Token response
 */
async function exchangeCodeForToken(config, code, codeVerifier) {
    const response = await axios.post(config.tokenUrl, {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: code,
        redirect_uri: config.redirectUri,
        code_verifier: codeVerifier
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    
    return response.data;
}

/**
 * Decodes JWT ID token to extract user information
 * @param {string} idToken - JWT ID token
 * @returns {Object} Decoded user information
 */
function decodeIdToken(idToken) {
    try {
        if (!idToken || typeof idToken !== 'string') {
            return {};
        }
        
        const parts = idToken.split('.');
        if (parts.length !== 3) {
            return {};
        }
        
        const payload = parts[1];
        const decodedPayload = Buffer.from(payload, 'base64').toString('utf-8');
        return JSON.parse(decodedPayload);
    } catch (error) {
        console.error('Error decoding ID token:', error);
        return {};
    }
}

/**
 * Validates OAuth state parameter
 * @param {string} receivedState - State received from OAuth provider
 * @param {string} sessionState - State stored in session
 * @returns {boolean} True if states match
 */
function validateState(receivedState, sessionState) {
    if (!receivedState || !sessionState) {
        return false;
    }
    return receivedState === sessionState;
}

module.exports = {
    generatePKCE,
    generateState,
    buildAuthUrl,
    exchangeCodeForToken,
    decodeIdToken,
    validateState
};