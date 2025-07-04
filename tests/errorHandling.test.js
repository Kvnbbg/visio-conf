const request = require('supertest');
const { generateZegoToken } = require('../lib/tokenGenerator');

// Mock the tokenGenerator to simulate errors
jest.mock('../lib/tokenGenerator', () => ({
  generateZegoToken: jest.fn(),
  validateTokenParams: jest.fn()
}));

describe('Error Handling', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require the app to get a fresh instance with mocked dependencies
    delete require.cache[require.resolve('../server')];
    app = require('../server');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should handle token generation errors gracefully', async () => {
    const { validateTokenParams } = require('../lib/tokenGenerator');
    
    // Mock validation to pass
    validateTokenParams.mockReturnValue({ isValid: true });
    
    // Mock token generation to throw an error
    generateZegoToken.mockImplementation(() => {
      throw new Error('Token generation failed');
    });

    const response = await request(app)
      .post('/api/generate-token')
      .send({
        roomID: 'test_room',
        userID: 'test_user'
      })
      .expect(500);

    expect(response.body).toHaveProperty('error', 'Erreur lors de la génération du token');
    expect(generateZegoToken).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'test_room',
      'test_user'
    );
  });

  test('should handle crypto errors during token generation', async () => {
    const { validateTokenParams } = require('../lib/tokenGenerator');
    
    // Mock validation to pass
    validateTokenParams.mockReturnValue({ isValid: true });
    
    // Mock token generation to throw a crypto-specific error
    generateZegoToken.mockImplementation(() => {
      throw new Error('Invalid key length');
    });

    const response = await request(app)
      .post('/api/generate-token')
      .send({
        roomID: 'test_room',
        userID: 'test_user'
      })
      .expect(500);

    expect(response.body).toHaveProperty('error', 'Erreur lors de la génération du token');
  });

  test('should handle unexpected errors during token generation', async () => {
    const { validateTokenParams } = require('../lib/tokenGenerator');
    
    // Mock validation to pass
    validateTokenParams.mockReturnValue({ isValid: true });
    
    // Mock token generation to throw an unexpected error
    generateZegoToken.mockImplementation(() => {
      throw new TypeError('Cannot read property of undefined');
    });

    const response = await request(app)
      .post('/api/generate-token')
      .send({
        roomID: 'test_room',
        userID: 'test_user'
      })
      .expect(500);

    expect(response.body).toHaveProperty('error', 'Erreur lors de la génération du token');
  });
});