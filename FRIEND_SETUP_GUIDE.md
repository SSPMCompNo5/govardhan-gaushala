# 🐄 Govardhan Goshala - Friend Setup Guide

Welcome! This guide will help you set up and run the Govardhan Goshala Management System on your PC.

## 📋 Prerequisites

### Required Software:
1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Git** - [Download here](https://git-scm.com/downloads)
3. **Node.js** (optional, for development) - [Download here](https://nodejs.org/)

### System Requirements:
- **OS**: Windows 10/11, macOS, or Linux
- **RAM**: Minimum 4GB (8GB recommended)
- **Storage**: At least 2GB free space
- **Internet**: Required for initial setup

## 🚀 Quick Start (5 minutes)

### Step 1: Install Docker Desktop
1. Download Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop/)
2. Install and start Docker Desktop
3. Wait for Docker to fully start (you'll see a green icon in system tray)

### Step 2: Get the Project
```bash
# Clone the repository
git clone <your-repo-url>
cd govardhan-goshala

# Or download as ZIP and extract
```

### Step 3: Configure Environment
```bash
# Copy the environment template
cp docker.env.example .env.local

# Edit the file with your settings (see Configuration section below)
```

### Step 4: Start Everything
```bash
# Start all services
npm run docker:up

# Or manually:
docker-compose up -d
```

### Step 5: Access the Application
- **Main App**: http://localhost:3000
- **Database Admin**: http://localhost:8081 (admin/admin123)
- **Redis Admin**: http://localhost:8082

## ⚙️ Configuration Options

### Option 1: Use Cloud Database (Recommended)
Edit `.env.local`:
```env
# Use your friend's MongoDB Atlas connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/goshala?retryWrites=true&w=majority
MONGODB_DB=goshala

# Use your friend's Redis cloud service
REDIS_URL=redis://username:password@your-redis-host:6379
```

### Option 2: Use Local Docker Services (Default)
Keep the default settings in `.env.local`:
```env
# Local Docker services
MONGODB_URI=mongodb://admin:goshala123@localhost:27017/goshala?authSource=admin
REDIS_URL=redis://localhost:6379
```

### Option 3: Use Your Own Services
```env
# Your own MongoDB
MONGODB_URI=mongodb://your-mongo-host:27017/goshala

# Your own Redis
REDIS_URL=redis://your-redis-host:6379
```

## 🔧 Available Commands

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down

# View logs
npm run docker:logs

# Restart services
npm run docker:restart

# Clean up everything (removes data!)
npm run docker:clean

# Build Docker image
npm run docker:build
```

## 🎯 What You Get

### Main Application (Port 3000)
- **Admin Dashboard**: Complete management interface
- **Watchman Dashboard**: Gate entry/exit management
- **Food Manager**: Inventory and feeding management
- **Cow Manager**: Cow profiles and health tracking
- **Doctor Dashboard**: Medical records and treatments
- **Real-time Updates**: Live data synchronization
- **Mobile Responsive**: Works on phones and tablets

### Database Admin (Port 8081)
- **MongoDB Management**: View/edit database collections
- **Data Import/Export**: Backup and restore data
- **User Management**: Manage user accounts
- **Login**: admin/admin123

### Redis Admin (Port 8082)
- **Cache Management**: View cached data
- **Performance Monitoring**: Track cache hits/misses
- **Memory Usage**: Monitor Redis memory

## 🔐 Default Login Credentials

The system comes with sample users. You can create new ones through the admin interface:

| Role | Username | Password | Access |
|------|----------|----------|---------|
| Owner/Admin | admin | admin123 | Full access |
| Goshala Manager | manager | manager123 | Management features |
| Food Manager | food | food123 | Food inventory |
| Cow Manager | cow | cow123 | Cow management |
| Doctor | doctor | doctor123 | Medical records |
| Watchman | watchman | watchman123 | Gate management |

## 🛠️ Troubleshooting

### Docker Issues
```bash
# Check if Docker is running
docker --version
docker info

# Restart Docker Desktop if needed
# Check system tray for Docker icon
```

### Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr :3000
netstat -ano | findstr :27017
netstat -ano | findstr :6379

# Stop conflicting services or change ports in docker-compose.yml
```

### Permission Issues
```bash
# On Windows, run PowerShell as Administrator
# On macOS/Linux, you might need sudo for some operations
```

### Memory Issues
```bash
# Increase Docker memory limit in Docker Desktop settings
# Recommended: 4GB+ for smooth operation
```

### Database Connection Issues
```bash
# Check if MongoDB container is running
docker-compose ps

# View MongoDB logs
docker-compose logs mongodb

# Restart MongoDB
docker-compose restart mongodb
```

## 📱 Mobile Access

The application is fully responsive and works on mobile devices:
- Access via your PC's IP address: `http://YOUR_PC_IP:3000`
- Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
- Make sure your firewall allows port 3000

## 🔄 Updates

To get the latest version:
```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
npm run docker:down
npm run docker:up
```

## 📊 Sample Data

The system includes sample data for testing:
- Sample cows with health records
- Food inventory items
- Gate logs and visitor entries
- Staff schedules and tasks
- Treatment records

## 🆘 Getting Help

### Common Issues:
1. **"Port already in use"**: Stop the conflicting service or change ports
2. **"Docker not running"**: Start Docker Desktop and wait for it to fully load
3. **"Cannot connect to database"**: Check if MongoDB container is running
4. **"Permission denied"**: Run terminal as administrator (Windows) or with sudo (Mac/Linux)

### Support:
- Check the logs: `npm run docker:logs`
- Restart everything: `npm run docker:restart`
- Clean start: `npm run docker:clean` then `npm run docker:up`

## 🎉 Success!

Once everything is running, you should see:
- ✅ All containers running (check with `docker-compose ps`)
- ✅ Application accessible at http://localhost:3000
- ✅ Database admin at http://localhost:8081
- ✅ Redis admin at http://localhost:8082

Enjoy managing your goshala! 🐄✨
