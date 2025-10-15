#!/usr/bin/env node

/**
 * Seed all users for Govardhan Goshala Management System
 * Run with: node seed-users.js
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goshala';
const MONGODB_DB = process.env.MONGODB_DB || 'goshala';

// User data to seed
const users = [
  {
    userId: 'admin',
    name: 'System Administrator',
    email: 'admin@goshala.local',
    role: 'Owner/Admin',
    description: 'Full system access and management'
  },
  {
    userId: 'manager',
    name: 'Goshala Manager',
    email: 'manager@goshala.local',
    role: 'Goshala Manager',
    description: 'Comprehensive goshala management'
  },
  {
    userId: 'food',
    name: 'Food Manager',
    email: 'food@goshala.local',
    role: 'Food Manager',
    description: 'Food inventory and feeding management'
  },
  {
    userId: 'cow',
    name: 'Cow Manager',
    email: 'cow@goshala.local',
    role: 'Cow Manager',
    description: 'Cow profiles and health management'
  },
  {
    userId: 'doctor',
    name: 'Veterinary Doctor',
    email: 'doctor@goshala.local',
    role: 'Doctor',
    description: 'Medical records and treatment management'
  },
  {
    userId: 'watchman',
    name: 'Gate Watchman',
    email: 'watchman@goshala.local',
    role: 'Watchman',
    description: 'Gate entry/exit management'
  }
];

async function seedUsers() {
  let client;
  
  try {
    console.log('🌱 Starting user seeding process...');
    console.log(`📡 Connecting to MongoDB: ${MONGODB_URI}`);
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    
    // Create unique index on userId
    await usersCollection.createIndex({ userId: 1 }, { unique: true });
    console.log('✅ Created unique index on userId');
    
    // Seed each user
    for (const userData of users) {
      try {
        // Hash password (default: admin123)
        const password = 'admin123';
        const passwordHash = await bcrypt.hash(password, 12);
        
        // Prepare user document
        const userDoc = {
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          passwordHash: passwordHash,
          password: passwordHash, // Also set password field for compatibility
          role: userData.role,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          description: userData.description
        };
        
        // Insert or update user
        const result = await usersCollection.updateOne(
          { userId: userData.userId },
          { 
            $set: userDoc,
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true }
        );
        
        if (result.upsertedId) {
          console.log(`✅ Created user: ${userData.userId} (${userData.role})`);
        } else {
          console.log(`🔄 Updated user: ${userData.userId} (${userData.role})`);
        }
        
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  User already exists: ${userData.userId}`);
        } else {
          console.error(`❌ Error seeding user ${userData.userId}:`, error.message);
        }
      }
    }
    
    // Display summary
    console.log('\n📊 Seeding Summary:');
    console.log('==================');
    
    const totalUsers = await usersCollection.countDocuments();
    console.log(`Total users in database: ${totalUsers}`);
    
    const usersByRole = await usersCollection.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    console.log('\nUsers by role:');
    usersByRole.forEach(role => {
      console.log(`  ${role._id}: ${role.count} user(s)`);
    });
    
    console.log('\n🔑 Login Credentials:');
    console.log('====================');
    users.forEach(user => {
      console.log(`  ${user.userId} / admin123 (${user.role})`);
    });
    
    console.log('\n🎉 User seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run the seeding
if (require.main === module) {
  seedUsers().catch(console.error);
}

module.exports = { seedUsers, users };
