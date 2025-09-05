# Docker Setup for Govardhan Goshala

This guide will help you set up and run the Govardhan Goshala Management System using Docker.

## Prerequisites

- Docker Desktop installed on your system
- Docker Compose (included with Docker Desktop)
- Git (to clone the repository)

## Quick Start

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd govardhan-goshala
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp docker.env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Database (Docker will use these automatically)
MONGODB_URI=mongodb://admin:goshala123@localhost:27017/goshala?authSource=admin
MONGODB_DB=goshala

# Redis
REDIS_URL=redis://localhost:6379

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-change-this-in-production

# Twilio (Optional - for SMS/WhatsApp notifications)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
TWILIO_WHATSAPP_NUMBER=your-twilio-whatsapp-number
TWILIO_TO_NUMBERS=+1234567890,+0987654321

# Alerts
ALERTS_AUTO_SMS=false
```

### 3. Start the Application

```bash
# Start all services (MongoDB, Redis, App)
npm run docker:up

# Or manually:
docker-compose up -d
```

### 4. Access the Application

- **Main Application**: http://localhost:3000
- **MongoDB Admin UI**: http://localhost:8081 (admin/admin123)
- **Redis Admin UI**: http://localhost:8082

## Available Services

### Core Services

1. **goshala-app** (Port 3000)
   - Next.js application
   - Main web interface

2. **goshala-mongodb** (Port 27017)
   - MongoDB database
   - Username: `admin`, Password: `goshala123`
   - Database: `goshala`

3. **goshala-redis** (Port 6379)
   - Redis cache server
   - No authentication required

### Admin Services

4. **goshala-mongo-express** (Port 8081)
   - MongoDB web admin interface
   - Username: `admin`, Password: `admin123`

5. **goshala-redis-commander** (Port 8082)
   - Redis web admin interface
   - No authentication required

## Docker Commands

### Basic Operations

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Clean up (removes volumes and containers)
npm run docker:clean
```

### Development

```bash
# Build the Docker image
npm run docker:build

# Run the app container only
npm run docker:run

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f mongodb
docker-compose logs -f redis
```

### Database Operations

```bash
# Access MongoDB shell
docker exec -it goshala-mongodb mongosh -u admin -p goshala123 --authenticationDatabase admin

# Backup database
docker exec goshala-mongodb mongodump --uri="mongodb://admin:goshala123@localhost:27017/goshala?authSource=admin" --out /backup

# Restore database
docker exec goshala-mongodb mongorestore --uri="mongodb://admin:goshala123@localhost:27017/goshala?authSource=admin" /backup/goshala
```

## Data Persistence

Data is persisted using Docker volumes:

- `mongodb_data`: MongoDB database files
- `redis_data`: Redis data files
- `./public/uploads`: Application uploads (mounted from host)

## Troubleshooting

### Common Issues

1. **Port conflicts**
   ```bash
   # Check what's using the ports
   netstat -tulpn | grep :3000
   netstat -tulpn | grep :27017
   netstat -tulpn | grep :6379
   ```

2. **Permission issues**
   ```bash
   # Fix uploads directory permissions
   sudo chown -R $USER:$USER ./public/uploads
   chmod -R 755 ./public/uploads
   ```

3. **Container won't start**
   ```bash
   # Check container logs
   docker-compose logs app
   docker-compose logs mongodb
   docker-compose logs redis
   ```

4. **Database connection issues**
   ```bash
   # Test MongoDB connection
   docker exec -it goshala-mongodb mongosh -u admin -p goshala123 --authenticationDatabase admin
   
   # Test Redis connection
   docker exec -it goshala-redis redis-cli ping
   ```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
npm run docker:clean

# Remove all images (optional)
docker system prune -a

# Start fresh
npm run docker:up
```

## Production Deployment

For production deployment:

1. **Update environment variables**:
   - Change `NEXTAUTH_SECRET` to a strong random string
   - Update `NEXTAUTH_URL` to your domain
   - Configure proper Twilio credentials

2. **Use production compose file**:
   ```bash
   npm run docker:prod
   ```

3. **Set up reverse proxy** (nginx/traefik) for SSL termination

4. **Configure monitoring** and logging

## Security Notes

- Change default passwords in production
- Use environment variables for sensitive data
- Enable SSL/TLS in production
- Regularly update Docker images
- Use Docker secrets for sensitive configuration

## Performance Optimization

- Increase MongoDB memory limits if needed
- Configure Redis memory policies
- Use Docker resource limits
- Enable MongoDB replica sets for high availability

## Support

If you encounter issues:

1. Check the logs: `npm run docker:logs`
2. Verify environment variables
3. Ensure all ports are available
4. Check Docker Desktop is running
5. Review this documentation

For additional help, check the main README.md or create an issue in the repository.
