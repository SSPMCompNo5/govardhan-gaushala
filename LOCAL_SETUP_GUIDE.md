# 🐄 Local Development Setup Guide

## ✅ MongoDB & Users Setup Complete!

Your local MongoDB database has been successfully seeded with all user accounts.

## 🚀 Quick Start

### 1. Start MongoDB (if not already running)
```bash
sudo systemctl start mongodb
# or
sudo mongod --config /etc/mongodb.conf --fork
```

### 2. Start the Application
```bash
npm run dev
```

### 3. Access the Application
- **URL**: http://localhost:3000
- **Login**: Use any of the credentials below

## 👥 Available User Accounts

| Username | Password | Role | Description |
|----------|----------|------|-------------|
| `admin` | `admin123` | Owner/Admin | Full system access and management |
| `manager` | `admin123` | Goshala Manager | Comprehensive goshala management |
| `food` | `admin123` | Food Manager | Food inventory and feeding management |
| `cow` | `admin123` | Cow Manager | Cow profiles and health management |
| `doctor` | `admin123` | Doctor | Medical records and treatment management |
| `watchman` | `admin123` | Watchman | Gate entry/exit management |

## 🔧 Database Management

### Verify Users
```bash
node verify-users.js
```

### Re-seed Users (if needed)
```bash
node seed-users-direct.js
```

### Connect to MongoDB
```bash
mongosh goshala
```

## 📁 Useful Scripts

- `seed-users-direct.js` - Direct MongoDB seeding (no app required)
- `seed-all-users.sh` - API-based seeding (requires app running)
- `verify-users.js` - Verify all users are properly seeded
- `check-status.sh` - Check Docker services status (for Docker setup)

## 🐛 Troubleshooting

### MongoDB Issues
```bash
# Check MongoDB status
sudo systemctl status mongodb

# Start MongoDB manually
sudo mongod --config /etc/mongodb.conf --fork

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

### Application Issues
```bash
# Check if app is running
curl http://localhost:3000/api/test-auth

# Check application logs
npm run dev
```

### Database Connection Issues
```bash
# Test MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# List databases
mongosh --eval "show dbs"

# Check users collection
mongosh goshala --eval "db.users.find().pretty()"
```

## 🌐 Access Points

- **Main Application**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/test-auth
- **Redis Test**: http://localhost:3000/api/test-redis

## 📝 Next Steps

1. **Start the application**: `npm run dev`
2. **Visit**: http://localhost:3000
3. **Login** with any of the user credentials above
4. **Explore** the different dashboards based on user roles

## 🎯 Role-Based Access

Each user role has access to different features:

- **Admin**: Full system access, user management, system settings
- **Goshala Manager**: Overall goshala operations, reports, staff management
- **Food Manager**: Food inventory, feeding schedules, supplier management
- **Cow Manager**: Cow profiles, health records, breeding management
- **Doctor**: Medical records, treatments, vaccination schedules
- **Watchman**: Gate logs, visitor management, entry/exit tracking

---

**🎉 You're all set! Your local development environment is ready to go.**
