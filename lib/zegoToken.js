const crypto = require('crypto');

/**
 * Validates token generation parameters
 * @param {string} roomID - Room identifier
 * @param {string} userID - User identifier
 * @param {string} appId - ZEGOCLOUD app ID
 * @param {string} serverSecret - ZEGOCLOUD server secret
 * @returns {Object} Validation result
 */
function validateTokenParams(roomID, userID, appId, serverSecret) {
    const errors = [];
    
    if (!roomID || typeof roomID !== 'string' || roomID.trim() === '') {
        errors.push('roomID is required and must be a non-empty string');
    }
    
    if (!userID || typeof userID !== 'string' || userID.trim() === '') {
        errors.push('userID is required and must be a non-empty string');
    }
    
    if (!appId || typeof appId !== 'string' || appId.trim() === '') {
        errors.push('appId is required and must be a non-empty string');
    }
    
    if (!serverSecret || typeof serverSecret !== 'string' || serverSecret.trim() === '') {
        errors.push('serverSecret is required and must be a non-empty string');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
}

/**
 * Generates a ZEGOCLOUD token for video conferencing
 * @param {string} roomID - Room identifier
 * @param {string} userID - User identifier
 * @param {string} appId - ZEGOCLOUD app ID
 * @param {string} serverSecret - ZEGOCLOUD server secret
 * @param {number} effectiveTimeInSeconds - Token validity duration (default: 3600)
 * @returns {string} Generated token
 */
function generateZegoToken(roomID, userID, appId, serverSecret, effectiveTimeInSeconds = 3600) {
    // Validate parameters
    const validation = validateTokenParams(roomID, userID, appId, serverSecret);
    if (!validation.isValid) {
        throw new Error(`Invalid parameters: ${validation.errors.join(', ')}`);
    }
    
    const payload = '';
    const nonce = Math.floor(Math.random() * 1000000);
    const timestamp = Math.floor(Date.now() / 1000);

    // Create HMAC signature
    const hash = crypto
        .createHmac('sha256', serverSecret)
        .update(`${appId}${timestamp}${nonce}${payload}`)
        .digest('base64');

    // Create token payload
    const tokenPayload = {
        app_id: parseInt(appId),
        user_id: userID,
        room_id: roomID,
        privilege: {
            1: 1, // login room
            2: 1, // publish stream
        },
        expired_ts: timestamp + effectiveTimeInSeconds,
        nonce,
        payload,
    };

    // Generate final token
    const token = `04${Buffer.from(JSON.stringify(tokenPayload)).toString('base64')}.${hash}`;
    
    return token;
}

/**
 * Checks if a token is expired based on its payload
 * @param {string} token - ZEGOCLOUD token
 * @returns {boolean} True if token is expired
 */
function isTokenExpired(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 2) return true;
        
        const payloadBase64 = parts[0].substring(2); // Remove '04' prefix
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
        
        const currentTimestamp = Math.floor(Date.now() / 1000);
        return currentTimestamp >= payload.expired_ts;
    } catch (error) {
        return true; // Consider invalid tokens as expired
    }
}

module.exports = {
    generateZegoToken,
    validateTokenParams,
    isTokenExpired
};