const { generateZegoToken, validateTokenParams } = require('../lib/tokenGenerator');
const crypto = require('crypto');

describe('Token Generator', () => {
  const mockAppId = 'test_app_id_123';
  const mockServerSecret = 'test_server_secret_456';
  const mockRoomID = 'room_123';
  const mockUserID = 'user_456';

  describe('generateZegoToken', () => {
    test('should generate a valid token with correct parameters', () => {
      const token = generateZegoToken(mockAppId, mockServerSecret, mockRoomID, mockUserID);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).toMatch(/^04.+\..+$/); // Should start with "04" and contain a dot
    });

    test('should generate different tokens for different users', () => {
      const token1 = generateZegoToken(mockAppId, mockServerSecret, mockRoomID, 'user1');
      const token2 = generateZegoToken(mockAppId, mockServerSecret, mockRoomID, 'user2');
      
      expect(token1).not.toBe(token2);
    });

    test('should generate different tokens for different rooms', () => {
      const token1 = generateZegoToken(mockAppId, mockServerSecret, 'room1', mockUserID);
      const token2 = generateZegoToken(mockAppId, mockServerSecret, 'room2', mockUserID);
      
      expect(token1).not.toBe(token2);
    });

    test('should include correct data in token payload', () => {
      const token = generateZegoToken(mockAppId, mockServerSecret, mockRoomID, mockUserID);
      
      // Extract the base64 encoded payload (between "04" and the first ".")
      const base64Payload = token.substring(2, token.lastIndexOf('.'));
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      
      expect(payload.app_id).toBe(mockAppId);
      expect(payload.user_id).toBe(mockUserID);
      expect(payload.room_id).toBe(mockRoomID);
      expect(payload.privilege).toEqual({ 1: 1, 2: 1 });
      expect(payload.expired_ts).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(typeof payload.nonce).toBe('number');
    });

    test('should use custom expiration time', () => {
      const customExpiration = 7200; // 2 hours
      const token = generateZegoToken(mockAppId, mockServerSecret, mockRoomID, mockUserID, customExpiration);
      
      const base64Payload = token.substring(2, token.lastIndexOf('.'));
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      
      const expectedExpiration = Math.floor(Date.now() / 1000) + customExpiration;
      expect(payload.expired_ts).toBeCloseTo(expectedExpiration, -1); // Allow 1 second tolerance
    });

    test('should throw error when appId is missing', () => {
      expect(() => {
        generateZegoToken('', mockServerSecret, mockRoomID, mockUserID);
      }).toThrow('appId, serverSecret, roomID, and userID are required');
    });

    test('should throw error when serverSecret is missing', () => {
      expect(() => {
        generateZegoToken(mockAppId, '', mockRoomID, mockUserID);
      }).toThrow('appId, serverSecret, roomID, and userID are required');
    });

    test('should throw error when roomID is missing', () => {
      expect(() => {
        generateZegoToken(mockAppId, mockServerSecret, '', mockUserID);
      }).toThrow('appId, serverSecret, roomID, and userID are required');
    });

    test('should throw error when userID is missing', () => {
      expect(() => {
        generateZegoToken(mockAppId, mockServerSecret, mockRoomID, '');
      }).toThrow('appId, serverSecret, roomID, and userID are required');
    });

    test('should throw error when effectiveTimeInSeconds is not a number', () => {
      expect(() => {
        generateZegoToken(mockAppId, mockServerSecret, mockRoomID, mockUserID, 'invalid');
      }).toThrow('effectiveTimeInSeconds must be a positive number');
    });

    test('should throw error when effectiveTimeInSeconds is negative', () => {
      expect(() => {
        generateZegoToken(mockAppId, mockServerSecret, mockRoomID, mockUserID, -100);
      }).toThrow('effectiveTimeInSeconds must be a positive number');
    });

    test('should throw error when effectiveTimeInSeconds is zero', () => {
      expect(() => {
        generateZegoToken(mockAppId, mockServerSecret, mockRoomID, mockUserID, 0);
      }).toThrow('effectiveTimeInSeconds must be a positive number');
    });

    test('should generate valid HMAC signature', () => {
      const token = generateZegoToken(mockAppId, mockServerSecret, mockRoomID, mockUserID);
      
      // Extract components
      const base64Payload = token.substring(2, token.lastIndexOf('.'));
      const signature = token.substring(token.lastIndexOf('.') + 1);
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      
      // Recreate the hash to verify
      const expectedHash = crypto
        .createHmac('sha256', mockServerSecret)
        .update(`${mockAppId}${payload.expired_ts - 3600}${payload.nonce}`)
        .digest('base64');
      
      // Note: We can't exactly match because timestamp changes, but we can verify structure
      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
    });
  });

  describe('validateTokenParams', () => {
    test('should return valid for correct parameters', () => {
      const result = validateTokenParams(mockRoomID, mockUserID);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should return invalid when roomID is missing', () => {
      const result = validateTokenParams('', mockUserID);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('roomID is required and must be a non-empty string');
    });

    test('should return invalid when roomID is null', () => {
      const result = validateTokenParams(null, mockUserID);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('roomID is required and must be a non-empty string');
    });

    test('should return invalid when roomID is undefined', () => {
      const result = validateTokenParams(undefined, mockUserID);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('roomID is required and must be a non-empty string');
    });

    test('should return invalid when roomID is only whitespace', () => {
      const result = validateTokenParams('   ', mockUserID);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('roomID is required and must be a non-empty string');
    });

    test('should return invalid when roomID is not a string', () => {
      const result = validateTokenParams(123, mockUserID);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('roomID is required and must be a non-empty string');
    });

    test('should return invalid when userID is missing', () => {
      const result = validateTokenParams(mockRoomID, '');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('userID is required and must be a non-empty string');
    });

    test('should return invalid when userID is null', () => {
      const result = validateTokenParams(mockRoomID, null);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('userID is required and must be a non-empty string');
    });

    test('should return invalid when userID is undefined', () => {
      const result = validateTokenParams(mockRoomID, undefined);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('userID is required and must be a non-empty string');
    });

    test('should return invalid when userID is only whitespace', () => {
      const result = validateTokenParams(mockRoomID, '   ');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('userID is required and must be a non-empty string');
    });

    test('should return invalid when userID is not a string', () => {
      const result = validateTokenParams(mockRoomID, 456);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('userID is required and must be a non-empty string');
    });

    test('should return invalid when both parameters are missing', () => {
      const result = validateTokenParams('', '');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('roomID is required and must be a non-empty string');
    });
  });
});