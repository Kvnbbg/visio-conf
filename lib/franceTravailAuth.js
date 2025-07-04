const axios = require('axios');
const logger = require('./logger');

// Configure axios retry (optional - only if axios-retry is available)
try {
    const axiosRetry = require('axios-retry');
    axiosRetry(axios, { 
        retries: 3, 
        retryDelay: axiosRetry.exponentialDelay,
        retryCondition: (error) => {
            return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
                   error.response?.status >= 500;
        }
    });
    logger.info('Axios retry configured successfully');
} catch (error) {
    logger.warn('Axios retry not available, continuing without retry functionality');
}

// France Travail API endpoints
const FRANCETRAVAIL_AUTH_URL = process.env.FRANCETRAVAIL_AUTH_URL || 
    'https://authentification-candidat.francetravail.fr/connexion/oauth2/authorize';
const FRANCETRAVAIL_TOKEN_URL = process.env.FRANCETRAVAIL_TOKEN_URL || 
    'https://authentification-candidat.francetravail.fr/connexion/oauth2/access_token';
const FRANCETRAVAIL_USERINFO_URL = process.env.FRANCETRAVAIL_USERINFO_URL || 
    'https://api.francetravail.io/partenaire/offresdemploi/v2/referentiel/metiers';

/**
 * Exchange authorization code for access token
 */
async function exchangeCodeForToken(config, code, codeVerifier) {
    try {
        logger.info('Exchanging authorization code for token');
        
        const tokenData = {
            grant_type: 'authorization_code',
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code: code,
            redirect_uri: config.redirectUri,
            code_verifier: codeVerifier
        };

        const response = await axios.post(FRANCETRAVAIL_TOKEN_URL, 
            new URLSearchParams(tokenData), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        logger.info('Token exchange successful');
        return response.data;
    } catch (error) {
        logger.error('Error exchanging code for token:', {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        throw new Error('Failed to exchange authorization code for token');
    }
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(config, refreshToken) {
    try {
        logger.info('Refreshing access token');
        
        const tokenData = {
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: config.clientId,
            client_secret: config.clientSecret
        };

        const response = await axios.post(FRANCETRAVAIL_TOKEN_URL, 
            new URLSearchParams(tokenData), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        logger.info('Token refresh successful');
        return response.data;
    } catch (error) {
        logger.error('Error refreshing token:', {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        throw new Error('Failed to refresh access token');
    }
}

/**
 * Get user information using access token
 */
async function getUserInfo(accessToken) {
    try {
        logger.info('Fetching user information');
        
        // Note: This is a placeholder. The actual userinfo endpoint may be different
        // You'll need to check France Travail documentation for the correct endpoint
        const response = await axios.get(FRANCETRAVAIL_USERINFO_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            timeout: 10000
        });

        logger.info('User info fetch successful');
        return response.data;
    } catch (error) {
        logger.error('Error fetching user info:', {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        // Return minimal user info if userinfo endpoint fails
        return {
            id: 'user_' + Date.now(),
            name: 'France Travail User',
            email: null
        };
    }
}

/**
 * Validate token by making a test API call
 */
async function validateToken(accessToken) {
    try {
        const response = await axios.get(FRANCETRAVAIL_USERINFO_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            },
            timeout: 10000
        });
        
        logger.info('Token validation successful');
        return true;
    } catch (error) {
        logger.warn('Token validation failed:', error.message);
        return false;
    }
}

module.exports = {
    exchangeCodeForToken,
    refreshAccessToken,
    getUserInfo,
    validateToken,
    FRANCETRAVAIL_AUTH_URL,
    FRANCETRAVAIL_TOKEN_URL
};