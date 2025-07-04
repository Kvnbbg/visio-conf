const { generateZegoToken, validateTokenParams, isTokenExpired } = require('../lib/zegoToken');

describe('ZegoToken Module', () => {
    const validParams = {
        roomID: 'test_room_123',
        userID: 'test_user_456',
        appId: '123456789',
        serverSecret: 'test_server_secret_key'
    };

    describe('validateTokenParams', () => {
        test('should validate correct parameters', () => {
            const result = validateTokenParams(
                validParams.roomID,
                validParams.userID,
                validParams.appId,
                validParams.serverSecret
            );
            
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        test('should reject empty roomID', () => {
            const result = validateTokenParams('', validParams.userID, validParams.appId, validParams.serverSecret);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('roomID is required and must be a non-empty string');
        });

        test('should reject empty userID', () => {
            const result = validateTokenParams(validParams.roomID, '', validParams.appId, validParams.serverSecret);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('userID is required and must be a non-empty string');
        });

        test('should reject empty appId', () => {
            const result = validateTokenParams(validParams.roomID, validParams.userID, '', validParams.serverSecret);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('appId is required and must be a non-empty string');
        });

        test('should reject empty serverSecret', () => {
            const result = validateTokenParams(validParams.roomID, validParams.userID, validParams.appId, '');
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('serverSecret is required and must be a non-empty string');
        });

        test('should reject null parameters', () => {
            const result = validateTokenParams(null, null, null, null);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(4);
        });

        test('should reject non-string parameters', () => {
            const result = validateTokenParams(123, 456, 789, 101112);
            
            expect(result.isValid).toBe(false);
            expect(result.errors).toHaveLength(4);
        });
    });

    describe('generateZegoToken', () => {
        test('should generate a valid token with correct parameters', () => {
            const token = generateZegoToken(
                validParams.roomID,
                validParams.userID,
                validParams.appId,
                validParams.serverSecret
            );
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token).toMatch(/^04.+\..+$/); // Should start with '04' and contain a dot
        });

        test('should generate different tokens for different rooms', () => {
            const token1 = generateZegoToken('room1', validParams.userID, validParams.appId, validParams.serverSecret);
            const token2 = generateZegoToken('room2', validParams.userID, validParams.appId, validParams.serverSecret);
            
            expect(token1).not.toBe(token2);
        });

        test('should generate different tokens for different users', () => {
            const token1 = generateZegoToken(validParams.roomID, 'user1', validParams.appId, validParams.serverSecret);
            const token2 = generateZegoToken(validParams.roomID, 'user2', validParams.appId, validParams.serverSecret);
            
            expect(token1).not.toBe(token2);
        });

        test('should throw error for invalid parameters', () => {
            expect(() => {
                generateZegoToken('', validParams.userID, validParams.appId, validParams.serverSecret);
            }).toThrow('Invalid parameters');
        });

        test('should use custom expiration time', () => {
            const customExpiration = 7200; // 2 hours
            const token = generateZegoToken(
                validParams.roomID,
                validParams.userID,
                validParams.appId,
                validParams.serverSecret,
                customExpiration
            );
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
        });

        test('should include correct payload structure', () => {
            const token = generateZegoToken(
                validParams.roomID,
                validParams.userID,
                validParams.appId,
                validParams.serverSecret
            );
            
            // Extract and decode the payload
            const parts = token.split('.');
            const payloadBase64 = parts[0].substring(2); // Remove '04' prefix
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));
            
            expect(payload.app_id).toBe(parseInt(validParams.appId));
            expect(payload.user_id).toBe(validParams.userID);
            expect(payload.room_id).toBe(validParams.roomID);
            expect(payload.privilege).toEqual({ 1: 1, 2: 1 });
            expect(payload.expired_ts).toBeGreaterThan(Math.floor(Date.now() / 1000));
        });
    });

    describe('isTokenExpired', () => {
        test('should return false for valid token', () => {
            const token = generateZegoToken(
                validParams.roomID,
                validParams.userID,
                validParams.appId,
                validParams.serverSecret,
                3600 // 1 hour from now
            );
            
            expect(isTokenExpired(token)).toBe(false);
        });

        test('should return true for expired token', () => {
            const token = generateZegoToken(
                validParams.roomID,
                validParams.userID,
                validParams.appId,
                validParams.serverSecret,
                -1 // Already expired
            );
            
            expect(isTokenExpired(token)).toBe(true);
        });

        test('should return true for invalid token format', () => {
            expect(isTokenExpired('invalid-token')).toBe(true);
            expect(isTokenExpired('not.a.valid.token')).toBe(true);
            expect(isTokenExpired('')).toBe(true);
        });

        test('should return true for malformed token', () => {
            expect(isTokenExpired('04invalid_base64.signature')).toBe(true);
        });
    });
});