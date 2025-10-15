#!/bin/bash

echo "🌱 Seeding all users for Govardhan Goshala Management System"
echo "============================================================"
echo ""

# Check if MongoDB is running locally
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running locally"
    echo "Please start MongoDB first:"
    echo "  - macOS: brew services start mongodb-community"
    echo "  - Ubuntu: sudo systemctl start mongod"
    echo "  - Windows: net start MongoDB"
    echo ""
    exit 1
fi

echo "✅ MongoDB is running locally"

# Check if the application is running
if ! curl -s http://localhost:3000/api/test-auth > /dev/null; then
    echo "❌ Application is not running on localhost:3000"
    echo "Please start the application first:"
    echo "  npm run dev"
    echo ""
    exit 1
fi

echo "✅ Application is running on localhost:3000"
echo ""

# Function to seed a user
seed_user() {
    local userId=$1
    local role=$2
    local name=$3
    
    echo "🌱 Seeding user: $userId ($role)..."
    
    response=$(curl -s -X POST http://localhost:3000/api/seed/admin \
        -H "Content-Type: application/json" \
        -d "{\"userId\":\"$userId\",\"password\":\"admin123\",\"role\":\"$role\",\"force\":true}")
    
    if echo "$response" | grep -q '"ok":true'; then
        echo "✅ Successfully seeded: $userId"
    else
        echo "❌ Failed to seed: $userId"
        echo "   Response: $response"
    fi
}

# Seed all users
echo "📝 Seeding users..."
echo "-------------------"

seed_user "admin" "Owner/Admin" "System Administrator"
seed_user "manager" "Goshala Manager" "Goshala Manager"
seed_user "food" "Food Manager" "Food Manager"
seed_user "cow" "Cow Manager" "Cow Manager"
seed_user "doctor" "Doctor" "Veterinary Doctor"
seed_user "watchman" "Watchman" "Gate Watchman"

echo ""
echo "🎉 User seeding completed!"
echo ""
echo "🔑 Login Credentials:"
echo "===================="
echo "  admin / admin123     (Owner/Admin - Full access)"
echo "  manager / admin123   (Goshala Manager)"
echo "  food / admin123      (Food Manager)"
echo "  cow / admin123       (Cow Manager)"
echo "  doctor / admin123    (Doctor)"
echo "  watchman / admin123  (Watchman)"
echo ""
echo "🌐 Access the application at: http://localhost:3000"
echo ""
