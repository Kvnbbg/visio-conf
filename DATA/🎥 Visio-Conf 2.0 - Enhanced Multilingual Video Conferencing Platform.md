# 🎥 Visio-Conf 2.0 - Enhanced Multilingual Video Conferencing Platform

[![CI/CD Pipeline](https://github.com/your-org/visio-conf/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/visio-conf/actions/workflows/ci.yml)
[![Security Scan](https://img.shields.io/badge/security-scanned-green.svg)](https://github.com/your-org/visio-conf/security)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/r/your-org/visio-conf)

A secure, multilingual video conferencing platform with France Travail OAuth integration and ZEGOCLOUD video services. Built with modern web technologies and designed for production deployment.

## 🌟 Features

### 🔐 Security & Authentication
- **France Travail OAuth 2.0 + PKCE**: Secure authentication with Proof Key for Code Exchange
- **Session Management**: Secure server-side session handling
- **Rate Limiting**: API protection against abuse
- **CORS Configuration**: Proper cross-origin resource sharing
- **Security Headers**: Comprehensive security header implementation

### 🌍 Multilingual Support
- **4 Languages**: French, English, Spanish, Chinese
- **Real-time Switching**: Instant language changes without page reload
- **Localized UI**: Complete interface translation
- **Cultural Adaptations**: Appropriate formatting for each locale

### 📹 Video Conferencing
- **HD Video Quality**: 1080p video support with adaptive streaming
- **ZEGOCLOUD Integration**: Professional-grade video infrastructure
- **Real-time Communication**: Low-latency audio and video
- **Meeting Management**: Create, join, and manage video conferences
- **Device Controls**: Camera and microphone management

### 🚀 Production Ready
- **Docker Containerization**: Complete Docker setup with multi-stage builds
- **Nginx Reverse Proxy**: Production-ready load balancing and SSL termination
- **Health Monitoring**: Comprehensive health checks and observability
- **CI/CD Pipeline**: Automated testing, building, and deployment
- **Scalable Architecture**: Designed for horizontal scaling

## 🏗️ Architecture

### Frontend
- **React 18** with modern hooks and functional components
- **Vite** for fast development and optimized builds
- **Tailwind CSS** with shadcn/ui components
- **TypeScript** for type safety (configurable)
- **Responsive Design** for desktop and mobile

### Backend
- **Flask** with modular blueprint architecture
- **SQLAlchemy** for database operations
- **Redis** for session storage (optional)
- **Flask-CORS** for cross-origin support
- **Comprehensive API** with OpenAPI documentation

### Infrastructure
- **Docker & Docker Compose** for containerization
- **Nginx** for reverse proxy and load balancing
- **Redis** for session management and caching
- **GitHub Actions** for CI/CD automation

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Git

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/visio-conf.git
cd visio-conf
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your credentials:

```bash
# ZEGOCLOUD Configuration (Required)
ZEGOCLOUD_APP_ID=your_zegocloud_app_id
ZEGOCLOUD_SERVER_SECRET=your_zegocloud_server_secret

# France Travail OAuth (Required)
FRANCETRAVAIL_CLIENT_ID=your_france_travail_client_id
FRANCETRAVAIL_CLIENT_SECRET=your_france_travail_client_secret
FRANCETRAVAIL_REDIRECT_URI=http://localhost:5000/api/auth/francetravail/callback

# Security (Required)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

### 3. Start the Application

```bash
# Development mode
docker-compose up -d

# Production mode with Nginx
docker-compose --profile production up -d
```

### 4. Access the Application

- **Application**: http://localhost:5000
- **API Health**: http://localhost:5000/api/health
- **API Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

## 📚 Documentation

### For Users
- **[User Guide](./USER_DOCUMENTATION.md)**: Complete user documentation
- **[Getting Started](./USER_DOCUMENTATION.md#getting-started)**: Quick start for end users
- **[Troubleshooting](./USER_DOCUMENTATION.md#troubleshooting)**: Common issues and solutions

### For Developers
- **[API Documentation](./API_DOCUMENTATION.md)**: Complete API reference
- **[Deployment Guide](./DEPLOYMENT_GUIDE.md)**: Production deployment instructions
- **[Architecture Plan](./architecture_improvement_plan.md)**: Technical architecture details

### For DevOps
- **[Docker Configuration](./docker-compose.yml)**: Container orchestration
- **[CI/CD Pipeline](./.github/workflows/ci.yml)**: Automated workflows
- **[Nginx Configuration](./nginx.conf)**: Reverse proxy setup

## 🛠️ Development

### Local Development Setup

1. **Backend Development**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   pip install -r requirements-test.txt
   python src/main.py
   ```

2. **Frontend Development**
   ```bash
   cd frontend
   npm install -g pnpm
   pnpm install
   pnpm run dev
   ```

3. **Run Tests**
   ```bash
   # Backend tests
   pytest tests/ -v

   # Frontend tests
   cd frontend && pnpm run test

   # Integration tests
   pytest tests/integration/ -v
   ```

### Code Quality

```bash
# Backend linting
cd backend && flake8 src/

# Frontend linting
cd frontend && pnpm run lint

# Security scanning
bandit -r backend/src/
pnpm audit
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ZEGOCLOUD_APP_ID` | Yes | ZEGOCLOUD application ID |
| `ZEGOCLOUD_SERVER_SECRET` | Yes | ZEGOCLOUD server secret |
| `FRANCETRAVAIL_CLIENT_ID` | Yes | France Travail OAuth client ID |
| `FRANCETRAVAIL_CLIENT_SECRET` | Yes | France Travail OAuth client secret |
| `FRANCETRAVAIL_REDIRECT_URI` | Yes | OAuth redirect URI |
| `SESSION_SECRET` | Yes | Session encryption secret |
| `REDIS_URL` | No | Redis connection URL |
| `NODE_ENV` | No | Environment (development/production) |
| `LOG_LEVEL` | No | Logging level (debug/info/warn/error) |

### External Service Setup

#### ZEGOCLOUD Setup
1. Register at [ZEGOCLOUD Console](https://console.zegocloud.com)
2. Create a new project
3. Copy App ID and Server Secret
4. Configure in `.env` file

#### France Travail OAuth Setup
1. Register at [France Travail Developer Portal](https://francetravail.io)
2. Create a new application
3. Configure redirect URI: `https://your-domain.com/api/auth/francetravail/callback`
4. Copy Client ID and Client Secret
5. Configure in `.env` file

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Build and deploy
docker-compose --profile production up -d

# Scale services
docker-compose up -d --scale app=3

# View logs
docker-compose logs -f app
```

### Cloud Deployment

#### AWS ECS
```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
docker build -t visio-conf .
docker tag visio-conf:latest your-account.dkr.ecr.us-east-1.amazonaws.com/visio-conf:latest
docker push your-account.dkr.ecr.us-east-1.amazonaws.com/visio-conf:latest
```

#### Google Cloud Run
```bash
# Build and deploy
gcloud builds submit --tag gcr.io/your-project/visio-conf
gcloud run deploy --image gcr.io/your-project/visio-conf --platform managed
```

#### Azure Container Instances
```bash
# Build and deploy
az acr build --registry your-registry --image visio-conf .
az container create --resource-group your-rg --name visio-conf --image your-registry.azurecr.io/visio-conf
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Scale deployment
kubectl scale deployment visio-conf --replicas=3

# Check status
kubectl get pods -l app=visio-conf
```

## 📊 Monitoring

### Health Checks
- **Application**: `GET /api/health`
- **Video Service**: `GET /api/video/health`
- **Database**: Included in application health check

### Metrics and Logging
- **Application Logs**: Structured JSON logging
- **Access Logs**: Nginx access logs
- **Error Tracking**: Sentry integration (optional)
- **Performance Monitoring**: Built-in metrics endpoints

### Alerting
Configure alerts for:
- Application health check failures
- High error rates
- Resource usage thresholds
- Authentication failures

## 🔒 Security

### Security Features
- **OAuth 2.0 + PKCE**: Secure authentication flow
- **HTTPS Enforcement**: SSL/TLS encryption
- **Security Headers**: HSTS, CSP, X-Frame-Options
- **Rate Limiting**: API abuse protection
- **Input Validation**: Comprehensive input sanitization
- **Session Security**: Secure session management

### Security Best Practices
- Regular security updates
- Dependency vulnerability scanning
- Container image scanning
- Secrets management
- Network security configuration

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `pytest tests/`
5. Commit changes: `git commit -m 'Add amazing feature'`
6. Push to branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

### Code Standards
- **Python**: Follow PEP 8, use Black for formatting
- **JavaScript/React**: Follow ESLint configuration
- **Commits**: Use conventional commit messages
- **Documentation**: Update relevant documentation

### Testing Requirements
- Unit tests for new functionality
- Integration tests for API endpoints
- Minimum 80% code coverage
- All tests must pass in CI/CD pipeline

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check the comprehensive documentation in this repository
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and community support

### Troubleshooting
- **Common Issues**: See [USER_DOCUMENTATION.md#troubleshooting](./USER_DOCUMENTATION.md#troubleshooting)
- **Deployment Issues**: See [DEPLOYMENT_GUIDE.md#troubleshooting](./DEPLOYMENT_GUIDE.md#troubleshooting)
- **API Issues**: See [API_DOCUMENTATION.md#error-handling](./API_DOCUMENTATION.md#error-handling)

## 🙏 Acknowledgments

- **France Travail**: For providing the OAuth authentication system
- **ZEGOCLOUD**: For the video conferencing infrastructure
- **Open Source Community**: For the amazing tools and libraries used in this project

---

**Built with ❤️ by the Visio-Conf Team**

*For the latest updates and releases, visit our [GitHub repository](https://github.com/your-org/visio-conf).*

