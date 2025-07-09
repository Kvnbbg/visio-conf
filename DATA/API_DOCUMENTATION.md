# Visio-Conf 2.0 API Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [Security](#security)
7. [Examples](#examples)

## Introduction

The Visio-Conf 2.0 API provides a comprehensive set of endpoints for managing video conferencing sessions, user authentication, and application configuration. This RESTful API is designed to integrate seamlessly with the France Travail OAuth 2.0 system and ZEGOCLOUD video services.

### Base URL

```
Production: https://your-domain.com/api
Development: http://localhost:5000/api
```

### API Version

Current version: `2.0.0`

### Content Type

All API requests and responses use `application/json` content type unless otherwise specified.

## Authentication

The API uses session-based authentication with France Travail OAuth 2.0 integration. Users must authenticate through the France Travail OAuth flow before accessing protected endpoints.

### OAuth 2.0 Flow

The authentication process follows the OAuth 2.0 Authorization Code flow with PKCE (Proof Key for Code Exchange) for enhanced security.

#### Step 1: Initiate Authentication

```http
GET /api/auth/francetravail
```

This endpoint redirects users to the France Travail authentication server.

#### Step 2: Handle Callback

```http
GET /api/auth/francetravail/callback?code={code}&state={state}
```

France Travail redirects users back to this endpoint after authentication.

#### Step 3: Check Authentication Status

```http
GET /api/auth/status
```

Returns the current authentication status and user information.

### Session Management

Sessions are managed server-side and persist across requests. Session cookies are httpOnly and secure in production environments.

## API Endpoints

### Health and Configuration

#### Health Check

```http
GET /api/health
```

Returns the application health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "visio-conf-backend",
  "version": "2.0.0",
  "timestamp": 1704067200,
  "environment": "production"
}
```

#### Get Configuration

```http
GET /api/config
```

Returns frontend configuration settings.

**Response:**
```json
{
  "francetravail": {
    "enabled": true,
    "realm": "individu"
  },
  "zegocloud": {
    "enabled": true
  },
  "features": {
    "multilingual": true,
    "video_conferencing": true,
    "authentication": true
  }
}
```

### Authentication Endpoints

#### Check Authentication Status

```http
GET /api/auth/status
```

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "user": {
    "id": "user123",
    "name": "John Doe",
    "email": "john.doe@example.com"
  }
}
```

**Response (Not Authenticated):**
```json
{
  "authenticated": false,
  "user": null
}
```

#### Logout

```http
POST /api/auth/logout
```

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

#### Refresh Token

```http
POST /api/auth/refresh
```

**Authentication Required:** Yes

**Response:**
```json
{
  "message": "Token refreshed"
}
```

### Video Conferencing Endpoints

#### Generate Video Token

```http
POST /api/video/token
```

**Authentication Required:** Yes

**Request Body:**
```json
{
  "roomId": "room_abc123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "appId": "your_zegocloud_app_id",
  "userId": "user123",
  "roomId": "room_abc123",
  "userName": "John Doe"
}
```

#### Create Room

```http
POST /api/video/room/create
```

**Authentication Required:** Yes

**Response:**
```json
{
  "roomId": "room_def456",
  "message": "Room created successfully",
  "roomInfo": {
    "roomId": "room_def456",
    "createdBy": "user123",
    "createdAt": 1704067200,
    "participants": []
  }
}
```

#### Join Room

```http
POST /api/video/room/{roomId}/join
```

**Authentication Required:** Yes

**Path Parameters:**
- `roomId` (string): The ID of the room to join

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "appId": "your_zegocloud_app_id",
  "userId": "user123",
  "roomId": "room_abc123",
  "userName": "John Doe",
  "message": "Joined room successfully"
}
```

#### Leave Room

```http
POST /api/video/room/{roomId}/leave
```

**Authentication Required:** Yes

**Path Parameters:**
- `roomId` (string): The ID of the room to leave

**Response:**
```json
{
  "message": "Left room successfully",
  "roomId": "room_abc123"
}
```

#### Video Service Health

```http
GET /api/video/health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "video",
  "timestamp": 1704067200,
  "zegocloud_configured": true
}
```

## Error Handling

The API uses standard HTTP status codes to indicate the success or failure of requests.

### HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Request successful |
| 201 | Created - Resource created successfully |
| 400 | Bad Request - Invalid request parameters |
| 401 | Unauthorized - Authentication required |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server error |

### Error Response Format

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE",
  "timestamp": 1704067200
}
```

### Common Error Responses

#### Authentication Required (401)

```json
{
  "error": "Authentication required"
}
```

#### Invalid Request (400)

```json
{
  "error": "Room ID is required"
}
```

#### Rate Limit Exceeded (429)

```json
{
  "error": "Too many requests",
  "retry_after": 60
}
```

## Rate Limiting

The API implements rate limiting to ensure fair usage and system stability.

### Limits

- **General API calls:** 100 requests per 15 minutes per IP address
- **Authentication endpoints:** 10 requests per minute per IP address
- **Video token generation:** 20 requests per minute per authenticated user

### Rate Limit Headers

Rate limit information is included in response headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067800
```

## Security

### HTTPS

All API communications must use HTTPS in production environments to ensure data encryption in transit.

### CORS

Cross-Origin Resource Sharing (CORS) is configured to allow requests from authorized frontend domains.

### Session Security

- Sessions use secure, httpOnly cookies
- CSRF protection is implemented
- Session data is encrypted

### Input Validation

All input parameters are validated and sanitized to prevent injection attacks.

## Examples

### Complete Authentication Flow

```javascript
// 1. Check current authentication status
const authStatus = await fetch('/api/auth/status');
const { authenticated } = await authStatus.json();

if (!authenticated) {
  // 2. Redirect to France Travail OAuth
  window.location.href = '/api/auth/francetravail';
}

// 3. After successful authentication, user is redirected back
// Check status again to get user info
const userInfo = await fetch('/api/auth/status');
const { user } = await userInfo.json();
console.log('Authenticated user:', user);
```

### Creating and Joining a Video Conference

```javascript
// 1. Create a new room
const createResponse = await fetch('/api/video/room/create', {
  method: 'POST',
  credentials: 'include'
});
const { roomId } = await createResponse.json();

// 2. Generate token for the room
const tokenResponse = await fetch('/api/video/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({ roomId })
});

const { token, appId, userId, userName } = await tokenResponse.json();

// 3. Initialize ZEGOCLOUD SDK with the token
// (This would be done in the frontend video component)
console.log('Video conference ready:', { token, appId, userId, userName });
```

### Error Handling Example

```javascript
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      credentials: 'include',
      ...options
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error.message);
    
    // Handle specific error cases
    if (error.message.includes('Authentication required')) {
      // Redirect to login
      window.location.href = '/api/auth/francetravail';
    }
    
    throw error;
  }
}

// Usage
try {
  const result = await apiCall('/api/video/room/create', { method: 'POST' });
  console.log('Room created:', result);
} catch (error) {
  console.error('Failed to create room:', error.message);
}
```

---

*This documentation is automatically generated and maintained. For questions or issues, please contact the development team.*

