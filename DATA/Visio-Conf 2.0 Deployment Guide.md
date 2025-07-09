# Visio-Conf 2.0 Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Docker Deployment](#docker-deployment)
4. [Production Deployment](#production-deployment)
5. [Environment Configuration](#environment-configuration)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 20GB
- Network: Stable internet connection

**Recommended for Production:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: High-speed internet with low latency

### Software Dependencies

**Required:**
- Docker 20.10+
- Docker Compose 2.0+
- Git

**Optional (for development):**
- Node.js 18+
- Python 3.11+
- Redis 6+

### External Services

**Required:**
1. **France Travail Developer Account**
   - Register at [francetravail.io](https://francetravail.io)
   - Create an application
   - Obtain Client ID and Client Secret

2. **ZEGOCLOUD Account**
   - Register at [ZEGOCLOUD Console](https://console.zegocloud.com)
   - Create a project
   - Obtain App ID and Server Secret

## Local Development Setup

### Option 1: Docker Development (Recommended)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd visio-conf-improved
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   nano .env
   ```

3. **Start Development Environment**
   ```bash
   docker-compose up -d
   ```

4. **Access the Application**
   - Frontend: http://localhost:5000
   - API Health: http://localhost:5000/api/health
   - Redis: localhost:6379

### Option 2: Native Development

1. **Setup Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Setup Frontend**
   ```bash
   cd frontend
   npm install -g pnpm
   pnpm install
   ```

3. **Start Services**
   ```bash
   # Terminal 1: Start Redis (if using)
   redis-server

   # Terminal 2: Start Backend
   cd backend
   source venv/bin/activate
   python src/main.py

   # Terminal 3: Start Frontend Development Server
   cd frontend
   pnpm run dev
   ```

4. **Build Frontend for Production**
   ```bash
   cd frontend
   pnpm run build
   # Copy dist/ contents to backend/src/static/
   cp -r dist/* ../backend/src/static/
   ```

## Docker Deployment

### Development Deployment

1. **Prepare Environment**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

2. **Start All Services**
   ```bash
   docker-compose up -d
   ```

3. **View Logs**
   ```bash
   # All services
   docker-compose logs -f

   # Specific service
   docker-compose logs -f app
   ```

4. **Stop Services**
   ```bash
   docker-compose down
   ```

### Production Deployment with Nginx

1. **Configure Production Environment**
   ```bash
   cp .env.example .env
   # Set NODE_ENV=production
   # Configure production URLs and secrets
   ```

2. **Start with Nginx**
   ```bash
   docker-compose --profile production up -d
   ```

3. **SSL Configuration (Optional)**
   ```bash
   # Place SSL certificates in ./ssl/ directory
   # cert.pem and key.pem
   # Uncomment HTTPS server block in nginx.conf
   ```

## Production Deployment

### Cloud Platform Deployment

#### Docker Hub Deployment

1. **Build and Push Image**
   ```bash
   # Build image
   docker build -t your-registry/visio-conf:latest .

   # Push to registry
   docker push your-registry/visio-conf:latest
   ```

2. **Deploy on Server**
   ```bash
   # Pull and run on production server
   docker pull your-registry/visio-conf:latest
   docker-compose -f docker-compose.prod.yml up -d
   ```

#### Cloud Provider Specific

**AWS ECS:**
1. Create ECS cluster
2. Define task definition with the Docker image
3. Configure load balancer
4. Set up RDS for Redis (optional)

**Google Cloud Run:**
1. Build and push to Google Container Registry
2. Deploy to Cloud Run
3. Configure custom domain
4. Set up Cloud Memorystore for Redis

**Azure Container Instances:**
1. Push to Azure Container Registry
2. Create container group
3. Configure networking
4. Set up Azure Cache for Redis

### Kubernetes Deployment

1. **Create Kubernetes Manifests**
   ```yaml
   # k8s/deployment.yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: visio-conf
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: visio-conf
     template:
       metadata:
         labels:
           app: visio-conf
       spec:
         containers:
         - name: visio-conf
           image: your-registry/visio-conf:latest
           ports:
           - containerPort: 5000
           env:
           - name: REDIS_URL
             value: "redis://redis-service:6379"
   ```

2. **Deploy to Kubernetes**
   ```bash
   kubectl apply -f k8s/
   ```

## Environment Configuration

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-super-secret-session-key

# ZEGOCLOUD Configuration
ZEGOCLOUD_APP_ID=your_zegocloud_app_id
ZEGOCLOUD_SERVER_SECRET=your_zegocloud_server_secret

# France Travail OAuth Configuration
FRANCETRAVAIL_CLIENT_ID=your_france_travail_client_id
FRANCETRAVAIL_CLIENT_SECRET=your_france_travail_client_secret
FRANCETRAVAIL_REDIRECT_URI=https://your-domain.com/api/auth/francetravail/callback
```

### Optional Environment Variables

```bash
# Redis Configuration
REDIS_URL=redis://your-redis-server:6379

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info

# Security
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### Security Considerations

1. **Secret Management**
   - Use environment variables for all secrets
   - Never commit secrets to version control
   - Use secret management services in production

2. **HTTPS Configuration**
   - Always use HTTPS in production
   - Configure proper SSL certificates
   - Enable HSTS headers

3. **CORS Configuration**
   - Restrict CORS origins to your domains
   - Avoid using wildcard (*) in production

## Monitoring and Maintenance

### Health Checks

The application provides several health check endpoints:

```bash
# Application health
curl http://localhost:5000/api/health

# Video service health
curl http://localhost:5000/api/video/health
```

### Logging

**Docker Logs:**
```bash
# View application logs
docker-compose logs -f app

# View all service logs
docker-compose logs -f
```

**Log Levels:**
- `error`: Error messages only
- `warn`: Warnings and errors
- `info`: General information (default)
- `debug`: Detailed debugging information

### Monitoring Setup

1. **Application Metrics**
   - Use Sentry for error tracking
   - Monitor API response times
   - Track user authentication success rates

2. **Infrastructure Metrics**
   - Monitor CPU and memory usage
   - Track disk space
   - Monitor network connectivity

3. **Business Metrics**
   - Track active video conferences
   - Monitor user authentication patterns
   - Measure feature usage

### Backup and Recovery

1. **Database Backup**
   ```bash
   # Backup Redis data
   docker exec visio-conf-redis redis-cli BGSAVE
   ```

2. **Configuration Backup**
   - Backup environment files
   - Store SSL certificates securely
   - Document configuration changes

### Updates and Maintenance

1. **Application Updates**
   ```bash
   # Pull latest changes
   git pull origin main

   # Rebuild and restart
   docker-compose build
   docker-compose up -d
   ```

2. **Security Updates**
   - Regularly update base Docker images
   - Monitor security advisories
   - Update dependencies

## Troubleshooting

### Common Issues

#### Application Won't Start

**Symptoms:** Container exits immediately or fails to start

**Solutions:**
1. Check environment variables
2. Verify port availability
3. Check Docker logs: `docker-compose logs app`
4. Ensure all required services are running

#### Authentication Issues

**Symptoms:** Users cannot log in with France Travail

**Solutions:**
1. Verify France Travail credentials
2. Check redirect URI configuration
3. Ensure HTTPS is used in production
4. Verify network connectivity to France Travail servers

#### Video Conferencing Problems

**Symptoms:** Cannot create or join video meetings

**Solutions:**
1. Verify ZEGOCLOUD credentials
2. Check network connectivity
3. Ensure WebRTC is not blocked by firewall
4. Test with different browsers

#### Performance Issues

**Symptoms:** Slow response times or high resource usage

**Solutions:**
1. Monitor resource usage: `docker stats`
2. Check Redis connectivity
3. Optimize Docker resource limits
4. Consider scaling horizontally

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set in .env file
LOG_LEVEL=debug

# Restart services
docker-compose restart
```

### Support and Resources

- **Application Logs:** Check Docker logs for detailed error messages
- **Health Endpoints:** Use `/api/health` for service status
- **Documentation:** Refer to API documentation for endpoint details
- **Community:** Check GitHub issues for known problems

---

*This deployment guide is maintained by the Visio-Conf development team. For the most current information, always refer to the latest version of this documentation.*

