const { 
    generatePKCE, 
    generateState, 
    buildAuthUrl, 
    decodeIdToken, 
    validateState 
} = require('../lib/auth');

describe('Auth Module', () => {
    describe('generatePKCE', () => {
        test('should generate valid PKCE parameters', () => {
            const { codeVerifier, codeChallenge } = generatePKCE();
            
            expect(codeVerifier).toBeDefined();
            expect(codeChallenge).toBeDefined();
            expect(typeof codeVerifier).toBe('string');
            expect(typeof codeChallenge).toBe('string');
            expect(codeVerifier.length).toBeGreaterThan(0);
            expect(codeChallenge.length).toBeGreaterThan(0);
        });

        test('should generate different values on each call', () => {
            const first = generatePKCE();
            const second = generatePKCE();
            
            expect(first.codeVerifier).not.toBe(second.codeVerifier);
            expect(first.codeChallenge).not.toBe(second.codeChallenge);
        });
    });

    describe('generateState', () => {
        test('should generate a valid state string', () => {
            const state = generateState();
            
            expect(state).toBeDefined();
            expect(typeof state).toBe('string');
            expect(state.length).toBe(32); // 16 bytes = 32 hex chars
        });

        test('should generate different values on each call', () => {
            const first = generateState();
            const second = generateState();
            
            expect(first).not.toBe(second);
        });
    });

    describe('buildAuthUrl', () => {
        const mockConfig = {
            clientId: 'test_client_id',
            redirectUri: 'http://localhost:3000/callback',
            authUrl: 'https://auth.example.com/oauth2/authorize'
        };

        test('should build a valid authorization URL', () => {
            const state = 'test_state';
            const codeChallenge = 'test_challenge';
            
            const url = buildAuthUrl(mockConfig, state, codeChallenge);
            
            expect(url).toContain(mockConfig.authUrl);
            expect(url).toContain(`client_id=${mockConfig.clientId}`);
            expect(url).toContain(`redirect_uri=${encodeURIComponent(mockConfig.redirectUri)}`);
            expect(url).toContain(`state=${state}`);
            expect(url).toContain(`code_challenge=${codeChallenge}`);
            expect(url).toContain('response_type=code');
            expect(url).toContain('scope=openid+profile');
            expect(url).toContain('code_challenge_method=S256');
        });
    });

    describe('decodeIdToken', () => {
        test('should decode a valid JWT token', () => {
            // Create a simple JWT-like token for testing
            const payload = { sub: 'user123', name: 'Test User' };
            const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');
            const mockToken = `header.${encodedPayload}.signature`;
            
            const decoded = decodeIdToken(mockToken);
            
            expect(decoded.sub).toBe('user123');
            expect(decoded.name).toBe('Test User');
        });

        test('should return empty object for invalid token', () => {
            const decoded = decodeIdToken('invalid.token');
            
            expect(decoded).toEqual({});
        });

        test('should handle malformed tokens gracefully', () => {
            const decoded = decodeIdToken('not-a-jwt-token');
            
            expect(decoded).toEqual({});
        });
    });

    describe('validateState', () => {
        test('should return true for matching states', () => {
            const state = 'test_state_123';
            
            expect(validateState(state, state)).toBe(true);
        });

        test('should return false for non-matching states', () => {
            expect(validateState('state1', 'state2')).toBe(false);
        });

        test('should return false for undefined states', () => {
            expect(validateState(undefined, 'state')).toBe(false);
            expect(validateState('state', undefined)).toBe(false);
            expect(validateState(undefined, undefined)).toBe(false);
        });
    });
});