#!/bin/bash

echo "🚀 Starting MongoDB Compass..."
echo "=============================="
echo ""

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running locally"
    echo "Starting MongoDB..."
    sudo systemctl start mongodb
    sleep 3
fi

echo "✅ MongoDB is running"
echo ""

# Connection details
echo "📋 Connection Details:"
echo "   Host: localhost"
echo "   Port: 27017"
echo "   Database: goshala"
echo "   Authentication: None (local development)"
echo ""

# Connection string
CONNECTION_STRING="mongodb://localhost:27017/goshala"
echo "🔗 Connection String:"
echo "   $CONNECTION_STRING"
echo ""

# Start MongoDB Compass
echo "🎯 Starting MongoDB Compass..."
echo "   You can paste the connection string above when prompted"
echo ""

# Try to start Compass
if command -v mongodb-compass > /dev/null; then
    mongodb-compass &
    echo "✅ MongoDB Compass started!"
else
    echo "❌ MongoDB Compass not found in PATH"
    echo "   Trying direct path..."
    "/opt/mongodb-compass/MongoDB Compass" &
    echo "✅ MongoDB Compass started!"
fi

echo ""
echo "🎉 MongoDB Compass should now be opening!"
echo ""
echo "📝 Quick Tips:"
echo "   • Use the connection string above to connect"
echo "   • Browse your 'goshala' database"
echo "   • View the 'users' collection to see your seeded data"
echo "   • Explore other collections as you add data to your app"
echo ""

