const { loadConfig } = require('../lib/config');

describe('Configuration', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.FRANCETRAVAIL_CLIENT_ID;
        delete process.env.FRANCETRAVAIL_CLIENT_SECRET;
        delete process.env.DEMO_MODE;
        delete process.env.PORT;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    test('should default to demo mode when credentials are missing', () => {
        const config = loadConfig();
        expect(config.demoMode).toBe(true);
        expect(config.hasFranceTravailCredentials).toBe(false);
    });

    test('should disable demo mode when explicitly set', () => {
        process.env.DEMO_MODE = 'false';
        const config = loadConfig();
        expect(config.demoMode).toBe(false);
    });

    test('should throw on invalid port', () => {
        process.env.PORT = 'not-a-number';
        expect(() => loadConfig()).toThrow('Invalid configuration');
    });
});
