# 🎥 Visio-Conf 2.0 - Enhanced Multilingual Video Conferencing Platform

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/Kvnbbg/visio-conf)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen.svg)](#testing)

A robust, multilingual video conferencing application with France Travail OAuth 2.0 integration, comprehensive security features, and production-ready architecture.

## 🌟 Key Features

### 🔐 **Advanced Authentication**
- **France Travail OAuth 2.0 + PKCE** integration
- **Automatic token refresh** for seamless sessions
- **Secure session management** with Redis support
- **State validation** and CSRF protection

### 🌍 **Multilingual Support**
- **2 Languages**: French, English (bilingual experience)
- **Dynamic language switching** with persistent preferences
- **i18next integration** for comprehensive internationalization
- **Automatic language detection** based on browser settings

### 🛡️ **Enterprise Security**
- **Rate limiting** (100 requests/15 minutes)
- **Request validation** and sanitization
- **Error handling** with centralized middleware
- **Security headers** (XSS, CSRF, Content-Type protection)
- **Sentry integration** for error tracking

### 📊 **Monitoring & Observability**
- **Health check endpoints** for system monitoring
- **Comprehensive logging** with Winston
- **Performance metrics** and error tracking
- **Redis session store** for scalability

### 🎬 **Video Conferencing**
- **ZEGOCLOUD integration** for high-quality video calls
- **Real-time communication** with WebRTC
- **Meeting room management** with secure token generation
- **Participant controls** (camera, microphone, screen sharing)
- **Automatic client fallback** to the free ZEGOCLOUD prebuilt kit whenever token APIs fail, so users never get stranded

## 🚀 Quick Start

### ⚡ Instant Demo (no external accounts required)

1. Install dependencies: `npm install`
2. Copy the sample environment file: `cp env.example .env`
3. Ensure `DEMO_MODE=true` is present in `.env` (enabled by default in development)
4. Start the application: `npm run dev`
5. Visit [http://localhost:3000](http://localhost:3000) and click **"Start demo session"**

You now have a fully interactive UI that behaves like a secure Zoom/Teams experience without configuring France Travail or ZEGOCLOUD credentials. When you're ready to plug in real services, disable demo mode and add your secrets as documented below.

### Prerequisites

- **Node.js** ≥ 18.0.0
- **npm** ≥ 8.0.0
- **Redis** (optional, for production)
- **France Travail Developer Account**
- **ZEGOCLOUD Account**

### Installation

```bash
# Clone the repository
git clone https://github.com/Kvnbbg/visio-conf.git
cd visio-conf

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your environment variables (see Configuration section)
nano .env

# Start the development server
npm run dev
```

The application will be available at `http://localhost:3001`

## 🚢 Deployment (Vercel)

Visio-Conf ships with a production-ready [`vercel.json`](vercel.json) so the repository root (`.`) must always be the deployment root.

### Deploying from Git (dashboard)
1. Import the GitHub repository inside Vercel.
2. Set **Framework Preset** to **Node.js** (the stack is Node.js + Express with a static React UI rendered via `public/index.html`).
3. Keep **Root Directory** as `.` and leave the build command empty—Vercel will run the `@vercel/node` build for `server.js` and publish everything under `public/` automatically. Confirm that the **Start Command** stays `npm start` so the platform executes `node server.js`.
4. Configure the environment variables listed in [Configuration](#-configuration) for every environment (Preview, Development, Production).
5. Push to `main` whenever you need a production deploy. The routes in `vercel.json` send `/static/*` assets straight from `public/` and forward every other request to the Express serverless function so React client-side routing keeps working.
6. (Optional) Provide a `REDIS_URL` (for example from [Upstash](https://upstash.com/)) if you need shared sessions across serverless invocations—otherwise the app automatically falls back to the in-memory session store which works for demo/testing deployments.

### Deploying from the CLI
1. Install the CLI: `npm i -g vercel`.
2. Authenticate with `vercel login` and run `vercel link` from the repo root (accept `.` when prompted for the directory).
3. Pull remote environment variables with `vercel env pull .env.local` (or create `.env` manually before running `vercel --env-file`).
4. Trigger a preview deployment using `vercel` or go straight to production with `vercel --prod`. This command clears the “No Deployment” banner you see in the dashboard.

> **Reminder:** If you restructure the project, update `vercel.json` accordingly so the server (`server.js`) and static assets remain routable.

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
SESSION_SECRET=your-super-secret-session-key
DEMO_MODE=true # Disable in production once OAuth is configured

# ZEGOCLOUD Configuration
ZEGOCLOUD_APP_ID=your_zegocloud_app_id
ZEGOCLOUD_SERVER_SECRET=your_zegocloud_server_secret
ALLOW_ZEGO_CLIENT_FALLBACK=true
ZEGOCLOUD_DEFAULT_MODE=fallback

# France Travail OAuth Configuration
FRANCETRAVAIL_CLIENT_ID=your_france_travail_client_id
FRANCETRAVAIL_CLIENT_SECRET=your_france_travail_client_secret
FRANCETRAVAIL_REDIRECT_URI=http://localhost:3001/auth/francetravail/callback

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### Secrets overlay (`.secrets`)

When you deploy to platforms such as Vercel you might not want to expose sensitive IDs inside `.env`. The server now loads an optional JSON file named [`.secrets`](.secrets.example) located at the repository root. Copy the template to get started:

```bash
cp .secrets.example .secrets
```

Every key from the JSON file is merged on top of environment variables, so you can safely store values like `ZEGOCLOUD_APP_ID`, `ZEGOCLOUD_SERVER_SECRET`, `ALLOW_ZEGO_CLIENT_FALLBACK`, or `ZEGOCLOUD_DEFAULT_MODE` without checking them into Git (the `.secrets` file is ignored by default). The `/api/config/client` endpoint exposes only the safe subset (App ID, default mode, feature flags) that the React UI needs to decide when to fall back to the browser-only meeting experience.

#### Demo Mode Controls

- `DEMO_MODE=true` (default in development) exposes `/api/auth/demo-login`, enabling instant UX testing without OAuth tokens.
- Set `DEMO_MODE=false` (or remove it) once `FRANCETRAVAIL_CLIENT_ID` and `FRANCETRAVAIL_CLIENT_SECRET` are populated to enforce real authentication flows.

### Getting API Credentials

#### France Travail API
1. Visit [francetravail.io](https://francetravail.io/)
2. Create a developer account
3. Register your application
4. Obtain `CLIENT_ID` and `CLIENT_SECRET`
5. Configure redirect URI: `https://your-domain.com/auth/francetravail/callback`

#### ZEGOCLOUD
1. Visit [ZEGOCLOUD Console](https://console.zegocloud.com/)
2. Create a new project
3. Obtain `APP_ID` and `SERVER_SECRET`
4. Enable video calling features

## 🏗️ Architecture

### Project Structure

```
visio-conf/
├── lib/                          # Core modules
│   ├── auth.js                   # OAuth 2.0 PKCE implementation
│   ├── zegoToken.js             # ZEGOCLOUD token management
│   ├── middleware.js            # Express security middleware
│   ├── logger.js                # Winston logging configuration
│   ├── redis.js                 # Redis client management
│   └── franceTravailAuth.js     # France Travail API integration
├── public/
│   └── locales/                 # Translation files
│       ├── en/translation.json  # English translations
│       └── fr/translation.json  # French translations
├── src/                         # React components (for build process)
│   ├── components/
│   │   ├── LanguageSwitcher.js  # Language selection component
│   │   ├── VideoConference.js   # Video conferencing UI
│   │   ├── AuthButton.js        # Authentication component
│   │   └── HealthCheck.js       # System status component
│   ├── App.js                   # Main React application
│   ├── index.js                 # React entry point
│   └── i18n.js                  # Internationalization setup
├── tests/                       # Comprehensive test suite
│   ├── auth.test.js            # Authentication tests
│   ├── zegoToken.test.js       # Token generation tests
│   ├── middleware.test.js      # Security middleware tests
│   ├── server.test.js          # API endpoint tests
│   ├── integration.test.js     # End-to-end tests
│   ├── franceTravailAuth.test.js # France Travail API tests
│   ├── logger.test.js          # Logging tests
│   └── redis.test.js           # Redis client tests
├── server.js                   # Enhanced Express server
├── public/index.html           # Main HTML with React integration
├── package.json               # Dependencies and scripts
├── vercel.json               # Vercel deployment configuration
└── README.md                 # This documentation
```

### Technology Stack

- **Backend**: Node.js, Express.js
- **Frontend**: React (CDN), Tailwind CSS
- **Video SDKs**: ZEGOCLOUD Express Engine + ZEGOCLOUD UIKit Prebuilt fallback

## 🆓 Free & Freemium Cloud Alternatives

If you want to stay within the zero-cost envelope, start with the default ZEGOCLOUD client fallback (pre-configured App ID `234470600`). When you are ready to branch out, the curated list in [`docs/free-alternatives.md`](docs/free-alternatives.md) highlights free-tier communication services (pCloud, Internxt, Icedrive) and zero-trust access stacks (Pomerium, Twingate, Cyolo, zrok) that pair nicely with Visio-Conf.
- **Authentication**: OAuth 2.0 + PKCE
- **Video**: ZEGOCLOUD WebRTC SDK
- **Internationalization**: i18next
- **Session Store**: Redis (with memory fallback)
- **Logging**: Winston
- **Testing**: Jest, Supertest
- **Deployment**: Vercel
- **Monitoring**: Sentry (optional)

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- auth.test.js
```

### Test Coverage

The application maintains **95.76% test coverage** for core modules:

- **113 total tests** across 8 test suites
- **Unit tests**: Authentication, token generation, middleware
- **Integration tests**: End-to-end workflows
- **API tests**: HTTP endpoints and error handling

### Test Categories

1. **Authentication Tests** (`auth.test.js`)
   - OAuth 2.0 PKCE flow validation
   - JWT token decoding
   - State parameter validation

2. **Token Generation Tests** (`zegoToken.test.js`)
   - ZEGOCLOUD token creation
   - Parameter validation
   - Expiration handling

3. **Middleware Tests** (`middleware.test.js`)
   - Security middleware validation
   - Rate limiting
   - Error handling

4. **Integration Tests** (`integration.test.js`)
   - Complete authentication flows
   - End-to-end scenarios

## 🌐 Internationalization

### Supported Languages

| Language | Code | Status | Coverage |
|----------|------|--------|----------|
| French   | `fr` | ✅ Complete | 100% |
| English  | `en` | ✅ Complete | 100% |

### Adding New Languages

1. Create translation file: `public/locales/{lang}/translation.json`
2. Register the locale inside `src/i18n.js`
3. Add the locale to the React `LanguageSwitcher` component and the CDN-based language switcher inside `public/index.html`
4. Provide UI copy for every key used in `public/index.html` and the React bundle
5. Test language switching functionality end-to-end

### Translation Keys

Key translation categories:
- **Authentication**: Login/logout messages
- **Navigation**: Menu items and buttons
- **Errors**: User-friendly error messages
- **Video**: Meeting controls and status
- **General**: Common UI elements

## 🔒 Security Features

### Authentication Security
- **OAuth 2.0 + PKCE** for secure authorization
- **State parameter validation** to prevent CSRF
- **Secure session management** with httpOnly cookies
- **Automatic token refresh** to maintain sessions

### Application Security
- **Rate limiting**: 100 requests per 15 minutes per IP
- **Input validation**: Comprehensive request validation
- **Security headers**: XSS, CSRF, and content-type protection
- **Error handling**: Secure error responses without information leakage

### Data Protection
- **Session encryption** with secure secrets
- **Redis session store** for production scalability
- **Secure cookie configuration** with SameSite protection
- **Environment variable protection** for sensitive data

## 📈 Performance & Monitoring

### Health Monitoring

Access system health at `/api/health`:

```json
{
  "status": "ok",
  "timestamp": "2024-07-04T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "version": "2.0.0",
  "services": {
    "redis": "connected",
    "franceTravail": "configured",
    "zegocloud": "configured"
  }
}
```

### Logging

Comprehensive logging with Winston:
- **Error logs**: `logs/error.log`
- **Combined logs**: `logs/combined.log`
- **Console output**: Development environment
- **Structured JSON**: Production logging

### Performance Optimizations

- **Redis session store** for horizontal scaling
- **Static asset caching** with appropriate headers
- **Rate limiting** to prevent abuse
- **Efficient error handling** with proper HTTP status codes

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**:
   ```bash
   vercel --prod
   ```

2. **Configure Environment Variables** in Vercel dashboard:
   - `ZEGOCLOUD_APP_ID`
   - `ZEGOCLOUD_SERVER_SECRET`
   - `FRANCETRAVAIL_CLIENT_ID`
   - `FRANCETRAVAIL_CLIENT_SECRET`
   - `SESSION_SECRET`
   - `REDIS_URL` (optional, use Upstash)

3. **Update Redirect URI**:
   ```
   https://your-app.vercel.app/auth/francetravail/callback
   ```

### Production Checklist

- [ ] Configure real France Travail credentials
- [ ] Set up Redis instance (Upstash recommended)
- [ ] Configure Sentry for error tracking
- [ ] Update CORS origins for production
- [ ] Set secure session secrets
- [ ] Enable HTTPS redirects
- [ ] Configure domain and SSL

### Environment-Specific Configuration

#### Development
```env
NODE_ENV=development
REDIS_URL=redis://localhost:6379
DEBUG=true
```

#### Production
```env
NODE_ENV=production
REDIS_URL=rediss://username:password@host:port
LOG_LEVEL=warn
SENTRY_DSN=your_production_sentry_dsn
```

## 🔧 API Reference

### Authentication Endpoints

#### `GET /auth/francetravail/login`
Initiates France Travail OAuth flow
- **Response**: Redirects to France Travail authorization

#### `GET /auth/francetravail/callback`
Handles OAuth callback
- **Parameters**: `code`, `state`
- **Response**: Redirects to application with session

#### `GET /api/auth/status`
Check authentication status
- **Response**: `{ authenticated: boolean, user?: object }`

#### `POST /api/auth/logout`
Logout current user
- **Response**: `{ success: boolean }`

#### `GET /api/auth/refresh`
Refresh access token
- **Response**: `{ success: boolean, accessToken?: string }`

### Video Conferencing Endpoints

#### `POST /api/generate-token`
Generate ZEGOCLOUD token for meeting
- **Body**: `{ roomID: string, userID: string }`
- **Response**: `{ token: string, appID: string, roomID: string, userID: string }`
- **Auth**: Required

### System Endpoints

#### `GET /api/health`
System health check
- **Response**: Health status object with service information

## 🤝 Contributing

### Development Setup

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Install dependencies**: `npm install`
4. **Run tests**: `npm test`
5. **Start development server**: `npm run dev`

### Code Standards

- **ESLint**: Follow JavaScript standard style
- **Testing**: Maintain >90% test coverage
- **Documentation**: Update README for new features
- **Security**: Follow OWASP guidelines

### Pull Request Process

1. **Update tests** for new functionality
2. **Run full test suite**: `npm test`
3. **Update documentation** as needed
4. **Create pull request** with detailed description

## 📝 Changelog

### Version 2.0.0 (Current)
- ✅ **Multilingual support** (French, English)
- ✅ **Enhanced security** with comprehensive middleware
- ✅ **Redis session store** for production scalability
- ✅ **Automatic token refresh** for seamless sessions
- ✅ **Comprehensive testing** (113 tests, 95.76% coverage)
- ✅ **Production monitoring** with health checks and logging
- ✅ **Enhanced error handling** with Sentry integration

### Version 1.0.0
- ✅ Basic France Travail OAuth integration
- ✅ ZEGOCLOUD video conferencing
- ✅ Express.js backend with session management
- ✅ Basic React frontend

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Documentation
- **API Documentation**: See API Reference section
- **Deployment Guide**: See Deployment section
- **Testing Guide**: See Testing section

### Community
- **Issues**: [GitHub Issues](https://github.com/Kvnbbg/visio-conf/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Kvnbbg/visio-conf/discussions)

### Professional Support
For enterprise support and custom development, please contact the development team.

---

**Built with ❤️ by the Visio-Conf Team**

*Empowering secure, multilingual video communication for the modern workplace.*