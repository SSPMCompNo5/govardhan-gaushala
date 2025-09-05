# 🚀 Quick Start for Friends

**Get the Govardhan Goshala Management System running in 5 minutes!**

## 📋 What You Need

1. **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
2. **Git** (optional) - [Download here](https://git-scm.com/downloads)

## ⚡ Super Quick Setup

### Step 1: Install Docker Desktop
- Download and install Docker Desktop
- Start it and wait for the green icon in your system tray

### Step 2: Get the Project
```bash
# Option A: Clone with Git
git clone <your-repo-url>
cd govardhan-goshala

# Option B: Download ZIP and extract
# Download the project ZIP file and extract it
```

### Step 3: One-Command Setup
```bash
# This will validate your setup and start everything
npm run setup:friend
```

### Step 4: Access Your Application
- **Main App**: http://localhost:3000
- **Login**: admin / admin123

## 🎯 That's It!

Your goshala management system is now running with:
- ✅ Complete management dashboard
- ✅ Gate entry/exit system
- ✅ Food inventory management
- ✅ Cow health tracking
- ✅ Staff management
- ✅ Real-time updates
- ✅ Mobile-friendly interface

## 🔧 If Something Goes Wrong

### Quick Fixes:
```bash
# Check what's wrong
npm run setup:validate

# Restart everything
npm run docker:restart

# View logs
npm run docker:logs

# Nuclear option (starts fresh)
npm run docker:clean
npm run docker:up
```

### Common Issues:
- **"Docker not running"**: Start Docker Desktop
- **"Port in use"**: Stop other services using ports 3000, 27017, 6379
- **"Permission denied"**: Run terminal as administrator

## 📱 Mobile Access

Access from your phone:
1. Find your PC's IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Go to: `http://YOUR_PC_IP:3000`
3. Make sure your firewall allows port 3000

## 🆘 Need Help?

1. **Run validation**: `npm run setup:validate`
2. **Check logs**: `npm run docker:logs`
3. **Read guides**:
   - `FRIEND_SETUP_GUIDE.md` - Complete setup guide
   - `TROUBLESHOOTING.md` - Fix common issues
   - `DOCKER_SETUP.md` - Technical details

## 🎉 Success!

You should see:
- All containers running
- Application at http://localhost:3000
- Database admin at http://localhost:8081 (admin/admin123)
- Redis admin at http://localhost:8082

**Enjoy managing your goshala! 🐄✨**
