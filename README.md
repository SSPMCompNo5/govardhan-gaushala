# 🐄 Govardhan Goshala Management System

A comprehensive, modern management system for cow shelters (goshala) built with Next.js, MongoDB, and Docker. Features real-time updates, mobile responsiveness, and role-based access control.

![GitHub stars](https://img.shields.io/github/stars/yourusername/govardhan-goshala?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/govardhan-goshala?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/govardhan-goshala)
![GitHub license](https://img.shields.io/github/license/yourusername/govardhan-goshala)

## ✨ Features

### 🏠 **Multi-Dashboard System**
- **Admin Dashboard**: Complete system overview and management
- **Watchman Dashboard**: Gate entry/exit management with mobile support
- **Food Manager**: Inventory tracking, feeding schedules, supplier management
- **Cow Manager**: Cow profiles, health records, breeding tracking
- **Doctor Dashboard**: Medical records, treatment plans, vaccination schedules

### 🔐 **Security & Access Control**
- Role-based access control (RBAC)
- JWT authentication with NextAuth.js
- CSRF protection
- Rate limiting
- Secure password hashing

### 📱 **Modern User Experience**
- Mobile-responsive design
- Real-time updates with Server-Sent Events
- Optimistic UI updates
- Loading skeletons and empty states
- Global error boundaries
- Accessibility (ARIA) support

### 🚀 **Performance & Scalability**
- Redis caching for improved performance
- MongoDB with optimized indexes
- Docker containerization
- API rate limiting
- Image optimization

### 📊 **Data Management**
- CSV import/export functionality
- Database backup and restore
- Real-time data synchronization
- Comprehensive reporting
- Audit logging

### 🔔 **Notifications**
- SMS notifications via Twilio
- WhatsApp integration
- Email notifications
- Critical alert system
- Auto-notifications for low stock

## 🚀 Quick Start

### Prerequisites
- Docker Desktop
- Git

### 5-Minute Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/govardhan-goshala.git
cd govardhan-goshala

# Start everything with one command
npm run setup:friend

# Access the application
# Main App: http://localhost:3000
# Login: admin / admin123
```

### Manual Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp env.friend.example .env.local
# Edit .env.local with your settings

# 3. Start with Docker
npm run docker:up

# 4. Access the application
open http://localhost:3000
```

## 📖 Documentation

- **[Quick Start Guide](QUICK_START.md)** - Get running in 5 minutes
- **[Friend Setup Guide](FRIEND_SETUP_GUIDE.md)** - Complete setup instructions
- **[Docker Setup](DOCKER_SETUP.md)** - Docker configuration details
- **[Troubleshooting](TROUBLESHOOTING.md)** - Common issues and solutions
- **[Contributing](CONTRIBUTING.md)** - How to contribute to the project

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Next.js API Routes, MongoDB, Redis
- **Authentication**: NextAuth.js with JWT
- **Database**: MongoDB with Mongoose
- **Caching**: Redis with ioredis
- **Containerization**: Docker & Docker Compose
- **Notifications**: Twilio (SMS/WhatsApp)

### Project Structure
```
govardhan-goshala/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── layout.js          # Root layout
├── components/            # React components
├── lib/                   # Utility libraries
├── public/                # Static assets
├── scripts/               # Setup and utility scripts
├── docker-compose.yml     # Docker services
├── Dockerfile            # Docker configuration
└── docs/                 # Documentation
```

## 🔧 Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server

# Docker
npm run docker:up        # Start all services
npm run docker:down      # Stop all services
npm run docker:logs      # View logs
npm run docker:restart   # Restart services
npm run docker:clean     # Clean up everything

# Setup & Validation
npm run setup:validate   # Validate setup
npm run setup:friend     # Validate and start
```

## 🌐 Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Main Application | http://localhost:3000 | admin/admin123 |
| Database Admin | http://localhost:8081 | admin/admin123 |
| Redis Admin | http://localhost:8082 | No auth required |

## 👥 User Roles

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Owner/Admin | admin | admin123 | Full system access |
| Goshala Manager | manager | manager123 | Management features |
| Food Manager | food | food123 | Food inventory only |
| Cow Manager | cow | cow123 | Cow management only |
| Doctor | doctor | doctor123 | Medical records only |
| Watchman | watchman | watchman123 | Gate management only |

## 📱 Mobile Support

The application is fully responsive and includes:
- Mobile-optimized dashboards
- Touch-friendly interfaces
- Offline capability for gate management
- Progressive Web App (PWA) features

## 🔒 Security Features

- **Authentication**: JWT-based with NextAuth.js
- **Authorization**: Role-based access control
- **CSRF Protection**: Double-submit cookie pattern
- **Rate Limiting**: API endpoint protection
- **Input Validation**: Zod schema validation
- **Secure Headers**: Security headers middleware
- **Password Security**: bcrypt hashing

## 📊 Key Features by Dashboard

### Admin Dashboard
- System overview and metrics
- User management
- Data import/export
- Backup and disaster recovery
- Performance monitoring
- Alert management

### Watchman Dashboard
- Gate entry/exit recording
- Visitor management
- Security checks
- Activity reports
- Mobile-optimized interface

### Food Manager
- Inventory tracking
- Feeding schedules
- Supplier management
- Stock alerts
- Cost tracking

### Cow Manager
- Cow profiles and photos
- Health records
- Breeding tracking
- Milk production logs
- Pasture management

### Doctor Dashboard
- Medical records
- Treatment plans
- Vaccination schedules
- Health monitoring
- Prescription management

## 🚀 Deployment

### Docker Deployment
```bash
# Production deployment
npm run docker:prod

# Development deployment
npm run docker:dev
```

### Environment Variables
Key environment variables:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - Authentication secret
- `TWILIO_ACCOUNT_SID` - Twilio credentials
- `JWT_SECRET` - JWT signing secret

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup
```bash
# Clone and setup
git clone https://github.com/yourusername/govardhan-goshala.git
cd govardhan-goshala
npm install

# Start development
npm run dev
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Styling with [Tailwind CSS](https://tailwindcss.com/)
- Database with [MongoDB](https://www.mongodb.com/)
- Caching with [Redis](https://redis.io/)
- Containerization with [Docker](https://www.docker.com/)

## 📞 Support

- 📖 **Documentation**: Check the `/docs` folder
- 🐛 **Issues**: [GitHub Issues](https://github.com/yourusername/govardhan-goshala/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/yourusername/govardhan-goshala/discussions)
- 📧 **Email**: your-email@example.com

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/govardhan-goshala&type=Date)](https://star-history.com/#yourusername/govardhan-goshala&Date)

---

**Made with ❤️ for the goshala community**

*If you find this project helpful, please give it a ⭐ on GitHub!*