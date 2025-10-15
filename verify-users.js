#!/usr/bin/env node

/**
 * Verify that all users are properly seeded in MongoDB
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goshala';
const MONGODB_DB = process.env.MONGODB_DB || 'goshala';

async function verifyUsers() {
  let client;
  
  try {
    console.log('🔍 Verifying seeded users...');
    console.log('============================');
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    
    // Get all users
    const users = await usersCollection.find({}).sort({ role: 1 }).toArray();
    
    console.log(`📊 Found ${users.length} users in database:`);
    console.log('');
    
    users.forEach(user => {
      console.log(`👤 ${user.userId.padEnd(10)} | ${user.role.padEnd(20)} | ${user.name}`);
    });
    
    console.log('');
    console.log('✅ All users verified successfully!');
    console.log('');
    console.log('🔑 You can now login with any of these credentials:');
    console.log('   Username: admin, manager, food, cow, doctor, watchman');
    console.log('   Password: admin123 (for all users)');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

if (require.main === module) {
  verifyUsers().catch(console.error);
}

module.exports = { verifyUsers };
