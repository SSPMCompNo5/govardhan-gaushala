#!/bin/bash

echo "🐄 Starting Govardhan Goshala Management System with Docker..."
echo "================================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose is not installed. Please install it first."
    exit 1
fi

echo "✅ Docker is running"
echo "✅ docker-compose is available"

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove any existing volumes (optional - uncomment if you want fresh data)
# echo "🗑️  Removing existing volumes..."
# docker-compose down -v

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check service status
echo "📊 Checking service status..."
docker-compose ps

echo ""
echo "🎉 Setup complete! Services are starting up..."
echo ""
echo "🌐 Access URLs:"
echo "   Main Application: http://localhost:3000"
echo "   MongoDB Admin:     http://localhost:8081 (admin/admin123)"
echo "   Redis Admin:       http://localhost:8082"
echo ""
echo "🔑 Default Login Credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📝 To view logs: docker-compose logs -f"
echo "🛑 To stop: docker-compose down"
echo ""
echo "⏳ Please wait 1-2 minutes for the application to fully initialize..."

