const crypto = require('crypto');

/**
 * Generates a ZEGOCLOUD token for video conferencing
 * @param {string} appId - ZEGOCLOUD App ID
 * @param {string} serverSecret - ZEGOCLOUD Server Secret
 * @param {string} roomID - Room ID for the conference
 * @param {string} userID - User ID for the participant
 * @param {number} effectiveTimeInSeconds - Token validity duration in seconds (default: 3600)
 * @returns {string} Generated token
 */
function generateZegoToken(appId, serverSecret, roomID, userID, effectiveTimeInSeconds = 3600) {
  if (!appId || !serverSecret || !roomID || !userID) {
    throw new Error('appId, serverSecret, roomID, and userID are required');
  }

  if (typeof effectiveTimeInSeconds !== 'number' || effectiveTimeInSeconds <= 0) {
    throw new Error('effectiveTimeInSeconds must be a positive number');
  }

  const payload = '';
  const nonce = Math.floor(Math.random() * 1000000);
  const timestamp = Math.floor(Date.now() / 1000);

  const hash = crypto
    .createHmac('sha256', serverSecret)
    .update(`${appId}${timestamp}${nonce}${payload}`)
    .digest('base64');

  const tokenData = {
    app_id: appId,
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

  const token = `04${Buffer.from(JSON.stringify(tokenData)).toString('base64')}.${hash}`;

  return token;
}

/**
 * Validates token generation parameters
 * @param {string} roomID - Room ID
 * @param {string} userID - User ID
 * @returns {Object} Validation result with isValid boolean and error message if invalid
 */
function validateTokenParams(roomID, userID) {
  if (!roomID || typeof roomID !== 'string' || roomID.trim() === '') {
    return { isValid: false, error: 'roomID is required and must be a non-empty string' };
  }

  if (!userID || typeof userID !== 'string' || userID.trim() === '') {
    return { isValid: false, error: 'userID is required and must be a non-empty string' };
  }

  return { isValid: true };
}

module.exports = {
  generateZegoToken,
  validateTokenParams
};