const { 
    exchangeCodeForToken, 
    refreshAccessToken, 
    getUserInfo, 
    validateToken 
} = require('../lib/franceTravailAuth');

// Mock axios
jest.mock('axios');
const axios = require('axios');

describe('France Travail Authentication', () => {
    const mockConfig = {
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        redirectUri: 'http://localhost:3001/callback'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('exchangeCodeForToken', () => {
        it('should exchange authorization code for token successfully', async () => {
            const mockTokenResponse = {
                data: {
                    access_token: 'mock_access_token',
                    refresh_token: 'mock_refresh_token',
                    expires_in: 3600,
                    token_type: 'Bearer'
                }
            };

            axios.post.mockResolvedValue(mockTokenResponse);

            const result = await exchangeCodeForToken(
                mockConfig, 
                'auth_code', 
                'code_verifier'
            );

            expect(result).toEqual(mockTokenResponse.data);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('access_token'),
                expect.any(URLSearchParams),
                expect.objectContaining({
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                })
            );
        });

        it('should handle token exchange errors', async () => {
            axios.post.mockRejectedValue(new Error('Network error'));

            await expect(exchangeCodeForToken(
                mockConfig, 
                'invalid_code', 
                'code_verifier'
            )).rejects.toThrow('Failed to exchange authorization code for token');
        });

        it('should handle HTTP error responses', async () => {
            const errorResponse = {
                response: {
                    status: 400,
                    data: { error: 'invalid_grant' }
                }
            };

            axios.post.mockRejectedValue(errorResponse);

            await expect(exchangeCodeForToken(
                mockConfig, 
                'invalid_code', 
                'code_verifier'
            )).rejects.toThrow('Failed to exchange authorization code for token');
        });
    });

    describe('refreshAccessToken', () => {
        it('should refresh access token successfully', async () => {
            const mockRefreshResponse = {
                data: {
                    access_token: 'new_access_token',
                    refresh_token: 'new_refresh_token',
                    expires_in: 3600
                }
            };

            axios.post.mockResolvedValue(mockRefreshResponse);

            const result = await refreshAccessToken(mockConfig, 'refresh_token');

            expect(result).toEqual(mockRefreshResponse.data);
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('access_token'),
                expect.any(URLSearchParams),
                expect.objectContaining({
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Accept': 'application/json'
                    }
                })
            );
        });

        it('should handle refresh token errors', async () => {
            axios.post.mockRejectedValue(new Error('Invalid refresh token'));

            await expect(refreshAccessToken(
                mockConfig, 
                'invalid_refresh_token'
            )).rejects.toThrow('Failed to refresh access token');
        });
    });

    describe('getUserInfo', () => {
        it('should get user info successfully', async () => {
            const mockUserInfo = {
                data: {
                    id: 'user123',
                    name: 'John Doe',
                    email: 'john@example.com'
                }
            };

            axios.get.mockResolvedValue(mockUserInfo);

            const result = await getUserInfo('access_token');

            expect(result).toEqual(mockUserInfo.data);
            expect(axios.get).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer access_token',
                        'Accept': 'application/json'
                    }
                })
            );
        });

        it('should return default user info on API failure', async () => {
            axios.get.mockRejectedValue(new Error('API error'));

            const result = await getUserInfo('access_token');

            expect(result).toEqual({
                id: expect.stringMatching(/^user_\d+$/),
                name: 'France Travail User',
                email: null
            });
        });
    });

    describe('validateToken', () => {
        it('should validate token successfully', async () => {
            const mockUserInfo = {
                data: { id: 'user123', name: 'John Doe' }
            };

            axios.get.mockResolvedValue(mockUserInfo);

            const result = await validateToken('valid_token');

            expect(result).toBe(true);
        });

        it('should return false for invalid token', async () => {
            axios.get.mockRejectedValue(new Error('Invalid token'));

            const result = await validateToken('invalid_token');

            expect(result).toBe(false);
        });
    });

    describe('Error handling and retry logic', () => {
        it('should handle network timeouts', async () => {
            const timeoutError = new Error('timeout of 10000ms exceeded');
            timeoutError.code = 'ECONNABORTED';

            axios.post.mockRejectedValue(timeoutError);

            await expect(exchangeCodeForToken(
                mockConfig, 
                'code', 
                'verifier'
            )).rejects.toThrow('Failed to exchange authorization code for token');
        });

        it('should handle server errors (5xx)', async () => {
            const serverError = {
                response: {
                    status: 500,
                    data: { error: 'Internal Server Error' }
                }
            };

            axios.post.mockRejectedValue(serverError);

            await expect(exchangeCodeForToken(
                mockConfig, 
                'code', 
                'verifier'
            )).rejects.toThrow('Failed to exchange authorization code for token');
        });
    });

    describe('Request parameter validation', () => {
        it('should include correct parameters in token exchange', async () => {
            const mockResponse = { data: { access_token: 'token' } };
            axios.post.mockResolvedValue(mockResponse);

            await exchangeCodeForToken(mockConfig, 'auth_code', 'code_verifier');

            const callArgs = axios.post.mock.calls[0];
            const formData = callArgs[1];

            expect(formData.toString()).toContain('grant_type=authorization_code');
            expect(formData.toString()).toContain('client_id=test_client_id');
            expect(formData.toString()).toContain('client_secret=test_client_secret');
            expect(formData.toString()).toContain('code=auth_code');
            expect(formData.toString()).toContain('code_verifier=code_verifier');
        });

        it('should include correct parameters in token refresh', async () => {
            const mockResponse = { data: { access_token: 'new_token' } };
            axios.post.mockResolvedValue(mockResponse);

            await refreshAccessToken(mockConfig, 'refresh_token');

            const callArgs = axios.post.mock.calls[0];
            const formData = callArgs[1];

            expect(formData.toString()).toContain('grant_type=refresh_token');
            expect(formData.toString()).toContain('refresh_token=refresh_token');
            expect(formData.toString()).toContain('client_id=test_client_id');
            expect(formData.toString()).toContain('client_secret=test_client_secret');
        });
    });
});