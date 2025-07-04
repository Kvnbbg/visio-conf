const request = require('supertest');
const { generateZegoToken } = require('../lib/zegoToken');
const { generatePKCE, generateState, buildAuthUrl } = require('../lib/auth');

describe('Integration Tests', () => {
    describe('ZEGOCLOUD Token Generation Flow', () => {
        test('should generate valid token with real parameters', () => {
            const roomID = 'integration_test_room';
            const userID = 'integration_test_user';
            const appId = '123456789';
            const serverSecret = 'test_server_secret';

            const token = generateZegoToken(roomID, userID, appId, serverSecret);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token).toMatch(/^04.+\..+$/);

            // Verify token structure
            const parts = token.split('.');
            expect(parts).toHaveLength(2);

            const payloadBase64 = parts[0].substring(2);
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf-8'));

            expect(payload.app_id).toBe(parseInt(appId));
            expect(payload.user_id).toBe(userID);
            expect(payload.room_id).toBe(roomID);
            expect(payload.privilege).toEqual({ 1: 1, 2: 1 });
        });

        test('should generate tokens with different expiration times', () => {
            const roomID = 'test_room';
            const userID = 'test_user';
            const appId = '123456789';
            const serverSecret = 'test_secret';

            const shortToken = generateZegoToken(roomID, userID, appId, serverSecret, 1800); // 30 min
            const longToken = generateZegoToken(roomID, userID, appId, serverSecret, 7200); // 2 hours

            expect(shortToken).not.toBe(longToken);

            // Extract expiration times
            const shortPayload = JSON.parse(Buffer.from(shortToken.split('.')[0].substring(2), 'base64').toString('utf-8'));
            const longPayload = JSON.parse(Buffer.from(longToken.split('.')[0].substring(2), 'base64').toString('utf-8'));

            expect(longPayload.expired_ts).toBeGreaterThan(shortPayload.expired_ts);
        });
    });

    describe('OAuth 2.0 PKCE Flow', () => {
        test('should generate complete PKCE flow parameters', () => {
            const { codeVerifier, codeChallenge } = generatePKCE();
            const state = generateState();

            expect(codeVerifier).toBeDefined();
            expect(codeChallenge).toBeDefined();
            expect(state).toBeDefined();

            expect(typeof codeVerifier).toBe('string');
            expect(typeof codeChallenge).toBe('string');
            expect(typeof state).toBe('string');

            expect(codeVerifier.length).toBeGreaterThan(0);
            expect(codeChallenge.length).toBeGreaterThan(0);
            expect(state.length).toBe(32);
        });

        test('should build complete authorization URL', () => {
            const config = {
                clientId: 'test_client_id',
                redirectUri: 'http://localhost:3000/auth/francetravail/callback',
                authUrl: 'https://authentification-candidat.francetravail.fr/connexion/oauth2/authorize'
            };

            const { codeChallenge } = generatePKCE();
            const state = generateState();

            const authUrl = buildAuthUrl(config, state, codeChallenge);

            expect(authUrl).toContain(config.authUrl);
            expect(authUrl).toContain(`client_id=${config.clientId}`);
            expect(authUrl).toContain(`redirect_uri=${encodeURIComponent(config.redirectUri)}`);
            expect(authUrl).toContain(`state=${state}`);
            expect(authUrl).toContain(`code_challenge=${codeChallenge}`);
            expect(authUrl).toContain('response_type=code');
            expect(authUrl).toContain('scope=openid+profile');
            expect(authUrl).toContain('code_challenge_method=S256');

            // Verify URL is valid
            expect(() => new URL(authUrl)).not.toThrow();
        });
    });

    describe('End-to-End Authentication Flow Simulation', () => {
        test('should simulate complete authentication flow', () => {
            // Step 1: Generate PKCE parameters
            const { codeVerifier, codeChallenge } = generatePKCE();
            const state = generateState();

            expect(codeVerifier).toBeDefined();
            expect(codeChallenge).toBeDefined();
            expect(state).toBeDefined();

            // Step 2: Build authorization URL
            const config = {
                clientId: 'test_client_id',
                redirectUri: 'http://localhost:3000/auth/francetravail/callback',
                authUrl: 'https://authentification-candidat.francetravail.fr/connexion/oauth2/authorize'
            };

            const authUrl = buildAuthUrl(config, state, codeChallenge);
            expect(authUrl).toBeDefined();

            // Step 3: Simulate successful callback with user info
            const mockUserInfo = {
                sub: 'user_123456',
                name: 'Jean Dupont',
                email: 'jean.dupont@example.com'
            };

            // Step 4: Generate video conference token
            const roomID = 'meeting_room_789';
            const token = generateZegoToken(roomID, mockUserInfo.sub, '123456789', 'test_secret');

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            // Verify token contains correct user ID
            const payload = JSON.parse(Buffer.from(token.split('.')[0].substring(2), 'base64').toString('utf-8'));
            expect(payload.user_id).toBe(mockUserInfo.sub);
            expect(payload.room_id).toBe(roomID);
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle invalid ZEGOCLOUD parameters gracefully', () => {
            expect(() => {
                generateZegoToken('', 'user', 'app', 'secret');
            }).toThrow('Invalid parameters');

            expect(() => {
                generateZegoToken('room', '', 'app', 'secret');
            }).toThrow('Invalid parameters');

            expect(() => {
                generateZegoToken('room', 'user', '', 'secret');
            }).toThrow('Invalid parameters');

            expect(() => {
                generateZegoToken('room', 'user', 'app', '');
            }).toThrow('Invalid parameters');
        });

        test('should handle malformed OAuth configuration', () => {
            const invalidConfig = {
                clientId: '',
                redirectUri: 'invalid-url',
                authUrl: 'not-a-url'
            };

            // The buildAuthUrl function should still work but produce invalid URLs
            const { codeChallenge } = generatePKCE();
            const state = generateState();

            expect(() => {
                buildAuthUrl(invalidConfig, state, codeChallenge);
            }).toThrow(); // Should throw due to invalid URL
        });
    });

    describe('Security Validations', () => {
        test('should generate cryptographically secure random values', () => {
            const values = [];
            
            // Generate multiple values to check for uniqueness
            for (let i = 0; i < 100; i++) {
                const { codeVerifier, codeChallenge } = generatePKCE();
                const state = generateState();
                
                const combined = `${codeVerifier}:${codeChallenge}:${state}`;
                expect(values).not.toContain(combined);
                values.push(combined);
            }
        });

        test('should generate tokens with future expiration times', () => {
            const token = generateZegoToken('room', 'user', '123456789', 'secret');
            const payload = JSON.parse(Buffer.from(token.split('.')[0].substring(2), 'base64').toString('utf-8'));
            
            const currentTimestamp = Math.floor(Date.now() / 1000);
            expect(payload.expired_ts).toBeGreaterThan(currentTimestamp);
        });
    });
});