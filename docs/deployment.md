# Deployment Guide

This guide covers deploying the Rentman API Client to various platforms and environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring and Maintenance](#monitoring-and-maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ or Docker
- Rentman API token
- Domain name (for production)
- SSL certificate (for production)

## Environment Variables

Create a `.env` file with the following variables:

```bash
# Required
RENTMAN_TOKEN=your_rentman_api_token
RENTMAN_BASE_URL=https://www.rentman.online

# Server Configuration
PORT=3000
HOST=localhost
CORS_ORIGIN=*
NODE_ENV=production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Caching
CACHE_TTL=3600
CACHE_MAX_SIZE=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Image Processing
IMAGE_CDN_URL=
IMAGE_CACHE_DIR=./public/images
IMAGE_MAX_FILE_SIZE=10485760
IMAGE_QUALITY_THUMB=80
IMAGE_QUALITY_MEDIUM=85
IMAGE_QUALITY_LARGE=90

# API Configuration
RENTMAN_TIMEOUT=30000
RENTMAN_RETRIES=3
```

## Local Development

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Docker Deployment

### 1. Build Docker Image

```bash
docker build -t rentman-api-client .
```

### 2. Run with Docker Compose

```bash
docker-compose up -d
```

### 3. Run Standalone Container

```bash
docker run -d \
  --name rentman-api \
  -p 3000:3000 \
  -e RENTMAN_TOKEN=your_token \
  -e RENTMAN_BASE_URL=https://www.rentman.online \
  rentman-api-client
```

## Production Deployment

### Option 1: VPS/Cloud Server

#### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

#### 2. Deploy Application

```bash
# Clone repository
git clone <your-repo-url>
cd rentman-api-client

# Install dependencies
npm ci --production

# Build application
npm run build

# Start with PM2
pm2 start dist/index.js --name rentman-api
pm2 save
pm2 startup
```

#### 3. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/rentman-api
sudo ln -s /etc/nginx/sites-available/rentman-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

### Option 2: Docker on VPS

#### 1. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Deploy with Docker Compose

```bash
# Clone repository
git clone <your-repo-url>
cd rentman-api-client

# Set environment variables
cp .env.example .env
# Edit .env with production values

# Start services
docker-compose up -d
```

### Option 3: Cloud Platforms

#### Heroku

1. Create `Procfile`:
```
web: node dist/index.js
```

2. Deploy:
```bash
heroku create your-app-name
heroku config:set RENTMAN_TOKEN=your_token
git push heroku main
```

#### Railway

1. Connect GitHub repository
2. Set environment variables in Railway dashboard
3. Deploy automatically

#### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `node dist/index.js`
3. Set environment variables
4. Deploy

#### AWS ECS/Fargate

1. Create ECS cluster
2. Create task definition with Docker image
3. Create service with load balancer
4. Configure auto-scaling

## Monitoring and Maintenance

### Health Checks

The application provides several health check endpoints:

- `GET /health` - Simple health check
- `GET /api/health` - Detailed health status with metrics

### Logging

Logs are structured JSON format in production:

```bash
# View logs
pm2 logs rentman-api

# View Docker logs
docker logs rentman-api

# View with filtering
docker logs rentman-api 2>&1 | grep ERROR
```

### Performance Monitoring

Monitor key metrics:

- Response times
- Memory usage
- CPU usage
- Error rates
- Cache hit rates

### Updates

#### Docker Deployment

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

#### PM2 Deployment

```bash
# Pull latest changes
git pull origin main

# Install dependencies and build
npm ci --production
npm run build

# Restart application
pm2 restart rentman-api
```

## Troubleshooting

### Common Issues

#### 1. Server Won't Start

**Symptoms:** Application fails to start

**Solutions:**
- Check environment variables are set correctly
- Verify Rentman API token is valid
- Check port is not already in use
- Review logs for specific error messages

#### 2. API Connection Issues

**Symptoms:** 502 Bad Gateway or connection timeouts

**Solutions:**
- Verify `RENTMAN_BASE_URL` is correct
- Check network connectivity
- Verify API token permissions
- Check rate limiting

#### 3. High Memory Usage

**Symptoms:** Application consuming too much memory

**Solutions:**
- Check for memory leaks in logs
- Reduce cache size (`CACHE_MAX_SIZE`)
- Implement memory monitoring
- Consider horizontal scaling

#### 4. Slow Response Times

**Symptoms:** API responses are slow

**Solutions:**
- Check external API response times
- Optimize database queries
- Implement caching
- Scale horizontally

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
export NODE_ENV=development
```

### Performance Tuning

#### Memory Optimization

```bash
# Increase Node.js memory limit
node --max-old-space-size=2048 dist/index.js
```

#### Cache Optimization

```bash
# Adjust cache settings
export CACHE_TTL=7200  # 2 hours
export CACHE_MAX_SIZE=200
```

#### Rate Limiting

```bash
# Adjust rate limits
export RATE_LIMIT_MAX=200
export RATE_LIMIT_WINDOW_MS=60000
```

## Security Considerations

### 1. Environment Variables

- Never commit `.env` files
- Use secrets management in production
- Rotate API tokens regularly

### 2. Network Security

- Use HTTPS in production
- Configure firewall rules
- Implement rate limiting
- Use reverse proxy (Nginx)

### 3. Application Security

- Keep dependencies updated
- Implement proper error handling
- Use request validation
- Monitor for suspicious activity

## Backup and Recovery

### 1. Application Data

- Configuration files
- Environment variables
- Custom images (if any)

### 2. Database (if using external cache)

- Redis data persistence
- Regular backups
- Point-in-time recovery

### 3. Monitoring Data

- Log files
- Metrics data
- Health check history

## Scaling

### Horizontal Scaling

1. Load balancer (Nginx/HAProxy)
2. Multiple application instances
3. Shared cache (Redis)
4. Database clustering

### Vertical Scaling

1. Increase server resources
2. Optimize application code
3. Tune JVM/Node.js settings
4. Implement caching strategies

## Support

For additional support:

1. Check logs for error messages
2. Review this documentation
3. Check GitHub issues
4. Contact support team

## Changelog

- v1.0.0 - Initial release
- v1.1.0 - Added Docker support
- v1.2.0 - Added monitoring and health checks

