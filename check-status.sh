#!/bin/bash

echo "🐄 Govardhan Goshala Management System - Status Check"
echo "====================================================="
echo ""

# Check Docker status
echo "📦 Docker Services Status:"
echo "-------------------------"
docker-compose ps
echo ""

# Check Redis connection
echo "🔴 Redis Status:"
echo "---------------"
if docker exec goshala-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is running and responding"
    
    # Get Redis info
    echo "📊 Redis Info:"
    docker exec goshala-redis redis-cli info server | grep -E "(redis_version|uptime_in_seconds|connected_clients)"
    echo ""
    
    # Test Redis from application
    echo "🧪 Testing Redis from application:"
    REDIS_TEST=$(curl -s http://localhost:3000/api/test-redis | jq -r '.success // false')
    if [ "$REDIS_TEST" = "true" ]; then
        echo "✅ Application can connect to Redis"
    else
        echo "❌ Application cannot connect to Redis"
    fi
else
    echo "❌ Redis is not responding"
fi
echo ""

# Check MongoDB connection
echo "🍃 MongoDB Status:"
echo "-----------------"
if docker exec goshala-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is running and responding"
    
    # Get MongoDB info
    echo "📊 MongoDB Info:"
    docker exec goshala-mongodb mongosh --eval "db.runCommand({serverStatus: 1})" --quiet | jq -r '.version, .uptime'
    echo ""
else
    echo "❌ MongoDB is not responding"
fi
echo ""

# Check application health
echo "🌐 Application Status:"
echo "--------------------"
if curl -s -f http://localhost:3000 > /dev/null; then
    echo "✅ Application is running on http://localhost:3000"
    
    # Test authentication endpoint
    AUTH_TEST=$(curl -s http://localhost:3000/api/test-auth | jq -r '.success // false')
    if [ "$AUTH_TEST" = "true" ]; then
        echo "✅ Authentication system is working"
    else
        echo "❌ Authentication system has issues"
    fi
else
    echo "❌ Application is not responding"
fi
echo ""

# Check admin interfaces
echo "🔧 Admin Interfaces:"
echo "-------------------"
if curl -s -f http://localhost:8081 > /dev/null; then
    echo "✅ MongoDB Express (Database Admin): http://localhost:8081"
    echo "   Username: admin, Password: admin123"
else
    echo "❌ MongoDB Express is not accessible"
fi

if curl -s -f http://localhost:8082 > /dev/null; then
    echo "✅ Redis Commander (Redis Admin): http://localhost:8082"
else
    echo "❌ Redis Commander is not accessible"
fi
echo ""

# Check if admin user exists
echo "👤 Admin User Status:"
echo "--------------------"
ADMIN_EXISTS=$(docker exec goshala-mongodb mongosh -u admin -p goshala123 --authenticationDatabase admin goshala --eval "db.users.countDocuments({userId: 'admin'})" --quiet 2>/dev/null | tr -d '\r\n')
if [ "$ADMIN_EXISTS" = "1" ]; then
    echo "✅ Admin user exists in database"
else
    echo "❌ Admin user not found - seeding required"
    echo "   Run: curl -X POST http://localhost:3000/api/seed/admin -H 'Content-Type: application/json' -d '{\"userId\":\"admin\",\"password\":\"admin123\",\"role\":\"Owner/Admin\",\"force\":true}'"
fi
echo ""

# Summary
echo "📋 Summary:"
echo "----------"
echo "🌐 Main Application: http://localhost:3000"
echo "🔑 Default Login: admin / admin123"
echo "🧪 Test Login Page: http://localhost:3000/test-login.html"
echo "📊 Database Admin: http://localhost:8081 (admin/admin123)"
echo "🔴 Redis Admin: http://localhost:8082"
echo ""
echo "📝 Useful Commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  Full restart: docker-compose down && docker-compose up -d"
echo ""

