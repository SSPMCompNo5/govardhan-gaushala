#!/usr/bin/env node

/**
 * Debug authentication issues
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/goshala';
const MONGODB_DB = process.env.MONGODB_DB || 'goshala';

async function debugAuth() {
  let client;
  
  try {
    console.log('🔍 Debugging Authentication...');
    console.log('==============================');
    console.log(`📡 MongoDB URI: ${MONGODB_URI}`);
    console.log(`🗄️  Database: ${MONGODB_DB}`);
    console.log('');
    
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(MONGODB_DB);
    const usersCollection = db.collection('users');
    
    // Test user lookup
    console.log('');
    console.log('👤 Testing user lookup...');
    const user = await usersCollection.findOne({ userId: 'admin' });
    
    if (!user) {
      console.log('❌ Admin user not found!');
      return;
    }
    
    console.log('✅ Admin user found:');
    console.log(`   ID: ${user._id}`);
    console.log(`   UserId: ${user.userId}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.active}`);
    console.log(`   Has passwordHash: ${!!user.passwordHash}`);
    console.log(`   Has password: ${!!user.password}`);
    
    // Test password verification
    console.log('');
    console.log('🔐 Testing password verification...');
    const testPassword = 'admin123';
    
    if (user.passwordHash) {
      const isValid = await bcrypt.compare(testPassword, user.passwordHash);
      console.log(`✅ Password verification with passwordHash: ${isValid}`);
    }
    
    if (user.password) {
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`✅ Password verification with password: ${isValid}`);
    }
    
    // Test NextAuth format
    console.log('');
    console.log('🔑 NextAuth user format:');
    const nextAuthUser = {
      id: String(user._id),
      userId: user.userId,
      role: user.role,
      remember: false
    };
    console.log(JSON.stringify(nextAuthUser, null, 2));
    
    // Test environment variables
    console.log('');
    console.log('🌍 Environment Variables:');
    console.log(`   NEXTAUTH_SECRET: ${process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET'}`);
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'NOT SET'}`);
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? 'SET' : 'NOT SET'}`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (client) {
      await client.close();
      console.log('');
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

if (require.main === module) {
  debugAuth().catch(console.error);
}

module.exports = { debugAuth };
