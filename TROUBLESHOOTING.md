# 🛠️ Troubleshooting Guide

This guide helps you solve common issues when setting up the Govardhan Goshala Management System.

## 🚨 Quick Fixes

### Run Setup Validation
```bash
node scripts/validate-setup.js
```
This script will check your setup and tell you what needs to be fixed.

## 🔧 Common Issues & Solutions

### 1. Docker Issues

#### "Docker not found" or "Docker is not running"
**Problem**: Docker Desktop is not installed or not running.

**Solution**:
1. Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. Start Docker Desktop and wait for it to fully load (green icon in system tray)
3. Verify: `docker --version` and `docker info`

#### "Port already in use"
**Problem**: Another service is using the required ports.

**Solution**:
```bash
# Check what's using the ports
netstat -ano | findstr :3000
netstat -ano | findstr :27017
netstat -ano | findstr :6379

# Stop conflicting services or change ports in docker-compose.yml
```

#### "Permission denied" on Windows
**Problem**: Docker needs administrator privileges.

**Solution**:
1. Run PowerShell as Administrator
2. Or enable WSL2 integration in Docker Desktop settings

### 2. Environment Configuration Issues

#### "Missing MONGODB_URI in environment"
**Problem**: Environment variables are not properly configured.

**Solution**:
1. Copy the template: `cp env.friend.example .env.local`
2. Edit `.env.local` with your settings
3. Make sure to change the default secrets

#### "Invalid CSRF token"
**Problem**: Authentication issues.

**Solution**:
1. Clear browser cookies and cache
2. Restart the application: `npm run docker:restart`
3. Check if `NEXTAUTH_SECRET` is set in `.env.local`

### 3. Database Connection Issues

#### "Cannot connect to MongoDB"
**Problem**: Database container is not running or misconfigured.

**Solution**:
```bash
# Check container status
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb

# If using cloud MongoDB, check connection string
```

#### "Redis connection failed"
**Problem**: Redis container is not running.

**Solution**:
```bash
# Check Redis container
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

### 4. Application Issues

#### "Application won't start"
**Problem**: Build or configuration issues.

**Solution**:
```bash
# Clean rebuild
npm run docker:clean
npm run docker:up

# Check logs
npm run docker:logs
```

#### "Page not loading" or "404 errors"
**Problem**: Application routing issues.

**Solution**:
1. Check if the app container is running: `docker-compose ps`
2. View app logs: `docker-compose logs app`
3. Restart the app: `docker-compose restart app`

#### "Slow performance"
**Problem**: Insufficient resources or cache issues.

**Solution**:
1. Increase Docker memory limit (4GB+ recommended)
2. Clear Redis cache: Access http://localhost:8082
3. Restart all services: `npm run docker:restart`

### 5. Network Issues

#### "Cannot access from mobile device"
**Problem**: Firewall or network configuration.

**Solution**:
1. Find your PC's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Access via: `http://YOUR_PC_IP:3000`
3. Allow port 3000 through Windows Firewall

#### "Database admin not accessible"
**Problem**: Port 8081 is blocked or container not running.

**Solution**:
1. Check if mongo-express container is running
2. Try: http://localhost:8081
3. Default login: admin/admin123

## 🔍 Diagnostic Commands

### Check System Status
```bash
# Docker status
docker info
docker-compose ps

# Container logs
docker-compose logs app
docker-compose logs mongodb
docker-compose logs redis

# Resource usage
docker stats
```

### Check Ports
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :27017
netstat -ano | findstr :6379

# Mac/Linux
lsof -i :3000
lsof -i :27017
lsof -i :6379
```

### Check Environment
```bash
# Verify environment file
cat .env.local

# Test database connection
docker exec -it goshala-mongodb mongosh -u admin -p goshala123 --authenticationDatabase admin

# Test Redis connection
docker exec -it goshala-redis redis-cli ping
```

## 🆘 Emergency Recovery

### Complete Reset
If nothing works, start fresh:
```bash
# Stop and remove everything
npm run docker:clean

# Remove all Docker images (optional)
docker system prune -a

# Start fresh
npm run docker:up
```

### Data Backup
Before resetting, backup your data:
```bash
# Backup MongoDB
docker exec goshala-mongodb mongodump --uri="mongodb://admin:goshala123@localhost:27017/goshala?authSource=admin" --out /backup

# Copy backup from container
docker cp goshala-mongodb:/backup ./mongodb-backup
```

### Data Restore
```bash
# Copy backup to container
docker cp ./mongodb-backup goshala-mongodb:/backup

# Restore database
docker exec goshala-mongodb mongorestore --uri="mongodb://admin:goshala123@localhost:27017/goshala?authSource=admin" /backup/goshala
```

## 📞 Getting Help

### Before Asking for Help
1. Run the validation script: `node scripts/validate-setup.js`
2. Check the logs: `npm run docker:logs`
3. Try the emergency recovery steps above

### Information to Provide
When asking for help, include:
- Operating system (Windows/Mac/Linux)
- Docker version: `docker --version`
- Error messages (copy the full error)
. Output of: `docker-compose ps`
- Output of: `npm run docker:logs`

### Self-Help Resources
- **FRIEND_SETUP_GUIDE.md**: Complete setup instructions
- **DOCKER_SETUP.md**: Technical Docker details
- **README.md**: Project overview and features

## 🎯 Success Indicators

You know everything is working when:
- ✅ All containers show "Up" status: `docker-compose ps`
- ✅ Application loads: http://localhost:3000
- ✅ Database admin works: http://localhost:8081 (admin/admin123)
- ✅ Redis admin works: http://localhost:8082
- ✅ You can log in with default credentials
- ✅ No error messages in logs: `npm run docker:logs`

## 🔄 Maintenance

### Regular Tasks
```bash
# Update to latest version
git pull origin main
npm run docker:down
npm run docker:up

# Clean up old images
docker system prune

# Check for updates
docker-compose pull
```

### Monitoring
- Check container health: `docker-compose ps`
- Monitor resource usage: `docker stats`
- View application logs: `npm run docker:logs`

Remember: Most issues can be solved by restarting the services or checking the logs! 🚀
