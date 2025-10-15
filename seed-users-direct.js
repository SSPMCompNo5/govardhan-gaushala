#!/usr/bin/env node

/**
 * Direct MongoDB seeding script for local development
 * This script connects directly to MongoDB and seeds all users
 * Run with: node seed-users-direct.js
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goshala';
const MONGODB_DB = process.env.MONGODB_DB || 'goshala';

// All users to seed
const users = [
  {
    userId: 'admin',
    name: 'System Administrator',
    email: 'admin@goshala.local',
    role: 'Owner/Admin',
    description: 'Full system access and management capabilities'
  },
  {
    userId: 'manager',
    name: 'Goshala Manager',
    email: 'manager@goshala.local',
    role: 'Goshala Manager',
    description: 'Comprehensive goshala management and oversight'
  },
  {
    userId: 'food',
    name: 'Food Manager',
    email: 'food@goshala.local',
    role: 'Food Manager',
    description: 'Food inventory, feeding schedules, and supplier management'
  },
  {
    userId: 'cow',
    name: 'Cow Manager',
    email: 'cow@goshala.local',
    role: 'Cow Manager',
    description: 'Cow profiles, health records, and breeding management'
  },
  {
    userId: 'doctor',
    name: 'Veterinary Doctor',
    email: 'doctor@goshala.local',
    role: 'Doctor',
    description: 'Medical records, treatments, and vaccination management'
  },
  {
    userId: 'watchman',
    name: 'Gate Watchman',
    email: 'watchman@goshala.local',
    role: 'Watchman',
    description: 'Gate entry/exit management and visitor tracking'
  }
];

async function seedUsersDirect() {
  let client;
  
  try {
    console.log('🌱 Direct MongoDB User Seeding');
    console.log('==============================');
    console.log(`📡 Connecting to: ${MONGODB_URI}`);
    console.log(`🗄️  Database: ${MONGODB_DB}`);
    console.log('');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    
    // Create indexes
    try {
      await usersCollection.createIndex({ userId: 1 }, { unique: true });
      console.log('✅ Created unique index on userId');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Index on userId already exists');
      } else {
        throw error;
      }
    }
    
    console.log('');
    console.log('👥 Seeding users...');
    console.log('-------------------');
    
    let createdCount = 0;
    let updatedCount = 0;
    
    // Seed each user
    for (const userData of users) {
      try {
        // Hash the default password
        const defaultPassword = 'admin123';
        const passwordHash = await bcrypt.hash(defaultPassword, 12);
        
        // Prepare user document
        const userDoc = {
          userId: userData.userId,
          name: userData.name,
          email: userData.email,
          passwordHash: passwordHash,
          password: passwordHash, // For compatibility
          role: userData.role,
          active: true,
          description: userData.description,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Check if user exists
        const existingUser = await usersCollection.findOne({ userId: userData.userId });
        
        if (existingUser) {
          // Update existing user
          await usersCollection.updateOne(
            { userId: userData.userId },
            { 
              $set: {
                ...userDoc,
                createdAt: existingUser.createdAt // Preserve original creation date
              }
            }
          );
          console.log(`🔄 Updated: ${userData.userId} (${userData.role})`);
          updatedCount++;
        } else {
          // Insert new user
          await usersCollection.insertOne(userDoc);
          console.log(`✅ Created: ${userData.userId} (${userData.role})`);
          createdCount++;
        }
        
      } catch (error) {
        console.error(`❌ Error with user ${userData.userId}:`, error.message);
      }
    }
    
    console.log('');
    console.log('📊 Seeding Summary');
    console.log('==================');
    console.log(`✅ Created: ${createdCount} users`);
    console.log(`🔄 Updated: ${updatedCount} users`);
    console.log(`📝 Total processed: ${users.length} users`);
    
    // Get final count
    const totalUsers = await usersCollection.countDocuments();
    console.log(`🗄️  Total users in database: ${totalUsers}`);
    
    // Show users by role
    console.log('');
    console.log('👥 Users by Role:');
    console.log('-----------------');
    const usersByRole = await usersCollection.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 }, users: { $push: '$userId' } } },
      { $sort: { _id: 1 } }
    ]).toArray();
    
    usersByRole.forEach(role => {
      console.log(`  ${role._id}: ${role.count} user(s) - ${role.users.join(', ')}`);
    });
    
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('====================');
    console.log('All users use the same password: admin123');
    console.log('');
    users.forEach(user => {
      console.log(`  ${user.userId.padEnd(10)} / admin123  (${user.role})`);
    });
    
    console.log('');
    console.log('🎉 User seeding completed successfully!');
    console.log('');
    console.log('🌐 Next steps:');
    console.log('  1. Start your application: npm run dev');
    console.log('  2. Visit: http://localhost:3000');
    console.log('  3. Login with any of the credentials above');
    console.log('');
    
  } catch (error) {
    console.error('');
    console.error('❌ Seeding failed:', error.message);
    console.error('');
    console.error('🔧 Troubleshooting:');
    console.error('  - Make sure MongoDB is running locally');
    console.error('  - Check your MONGODB_URI environment variable');
    console.error('  - Verify database permissions');
    console.error('');
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
  seedUsersDirect().catch(console.error);
}

module.exports = { seedUsersDirect, users };
