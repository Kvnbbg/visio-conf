# Testing Documentation

This document describes the testing setup and coverage for the visio-conf application.

## Test Framework

The project uses **Jest** as the testing framework with **Supertest** for HTTP endpoint testing.

## Test Structure

```
tests/
├── tokenGenerator.test.js    # Unit tests for token generation logic
├── server.test.js           # Integration tests for Express endpoints
├── errorHandling.test.js    # Error handling and edge case tests
└── serverStartup.test.js    # Server startup and configuration tests
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

Current test coverage:
- **Statement Coverage**: 91.3%
- **Branch Coverage**: 90%
- **Function Coverage**: 66.66%
- **Line Coverage**: 95.45%

## Test Categories

### 1. Unit Tests (`tokenGenerator.test.js`)
Tests the core token generation functionality:
- Valid token generation with correct parameters
- Token uniqueness for different users/rooms
- Token payload structure validation
- Custom expiration time handling
- Input validation and error handling
- HMAC signature verification

### 2. Integration Tests (`server.test.js`)
Tests the Express.js API endpoints:
- POST `/api/generate-token` with valid/invalid inputs
- GET `/health` endpoint
- HTTP status codes and response formats
- Request validation and error responses
- Special character handling in parameters

### 3. Error Handling Tests (`errorHandling.test.js`)
Tests error scenarios and edge cases:
- Token generation failures
- Crypto-related errors
- Unexpected runtime errors
- Proper error response formatting

### 4. Server Startup Tests (`serverStartup.test.js`)
Tests server initialization:
- Server startup with default port
- Custom PORT environment variable handling
- Process lifecycle management

## Key Features Tested

### Token Generation
- ✅ ZEGOCLOUD token format compliance
- ✅ HMAC-SHA256 signature generation
- ✅ Base64 encoding of token payload
- ✅ Configurable expiration times
- ✅ Unique nonce generation

### API Endpoints
- ✅ Input validation (roomID, userID)
- ✅ Error handling and appropriate HTTP status codes
- ✅ JSON response formatting
- ✅ Health check endpoint

### Security & Validation
- ✅ Parameter sanitization
- ✅ Type checking for inputs
- ✅ Empty string and whitespace handling
- ✅ Null/undefined parameter handling

### Error Resilience
- ✅ Graceful error handling
- ✅ Proper error logging
- ✅ User-friendly error messages
- ✅ Server stability under error conditions

## Test Data

Tests use mock data to avoid dependencies on external services:
- Mock App ID: `test_app_id_123`
- Mock Server Secret: `test_server_secret_456`
- Mock Room ID: `room_123`
- Mock User ID: `user_456`

## Continuous Integration

The test suite is designed to run in CI/CD environments with:
- No external dependencies
- Deterministic test results
- Proper cleanup of resources
- Timeout handling for long-running tests

## Future Improvements

Potential areas for additional testing:
- Load testing for concurrent token generation
- Integration tests with actual ZEGOCLOUD services
- Frontend JavaScript testing for the React components
- End-to-end testing with browser automation