// Database Index Initialization Script
// This script creates all necessary indexes for optimal performance
import clientPromise from './mongo';

export async function initializeIndexes() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    console.log('🚀 Initializing database indexes for optimal performance...');

    // Food Inventory Collection Indexes
    const inventoryCollection = db.collection('foodInventory');
    try {
      await inventoryCollection.createIndex({ createdAt: -1 });
      await inventoryCollection.createIndex({ status: 1 });
      await inventoryCollection.createIndex({ type: 1 });
      await inventoryCollection.createIndex({ name: "text", supplier: "text" });
      await inventoryCollection.createIndex({ status: 1, type: 1 });
      console.log('✅ Food Inventory indexes created');
    } catch (error) {
      console.log('ℹ️ Food Inventory indexes already exist or error:', error.message);
    }

    // Food Suppliers Collection Indexes
    const suppliersCollection = db.collection('foodSuppliers');
    try {
      await suppliersCollection.createIndex({ createdAt: -1 });
      await suppliersCollection.createIndex({ isActive: 1 });
      await suppliersCollection.createIndex({ foodTypes: 1 });
      await suppliersCollection.createIndex({ name: "text", contactPerson: "text", email: "text" });
      await suppliersCollection.createIndex({ isActive: 1, foodTypes: 1 });
      console.log('✅ Food Suppliers indexes created');
    } catch (error) {
      console.log('ℹ️ Food Suppliers indexes already exist or error:', error.message);
    }

    // Feeding Logs Collection Indexes
    const feedingLogsCollection = db.collection('feedingLogs');
    try {
      await feedingLogsCollection.createIndex({ feedingTime: -1 });
      await feedingLogsCollection.createIndex({ cowGroup: 1 });
      await feedingLogsCollection.createIndex({ foodType: 1 });
      await feedingLogsCollection.createIndex({ feedingTime: 1, cowGroup: 1 });
      await feedingLogsCollection.createIndex({ notes: "text", recordedBy: "text" });
      await feedingLogsCollection.createIndex({ cowGroup: 1, foodType: 1 });
      console.log('✅ Feeding Logs indexes created');
    } catch (error) {
      console.log('ℹ️ Feeding Logs indexes already exist or error:', error.message);
    }

    // Feeding Schedule Collection Indexes
    const feedingScheduleCollection = db.collection('feedingSchedule');
    try {
      await feedingScheduleCollection.createIndex({ time: 1 });
      await feedingScheduleCollection.createIndex({ cowGroup: 1 });
      await feedingScheduleCollection.createIndex({ foodType: 1 });
      await feedingScheduleCollection.createIndex({ isActive: 1 });
      await feedingScheduleCollection.createIndex({ isActive: 1, cowGroup: 1 });
      await feedingScheduleCollection.createIndex({ isActive: 1, time: 1 });
      console.log('✅ Feeding Schedule indexes created');
    } catch (error) {
      console.log('ℹ️ Feeding Schedule indexes already exist or error:', error.message);
    }

    // Users Collection Indexes (for authentication)
    const usersCollection = db.collection('users');
    try {
      await usersCollection.createIndex({ userId: 1 }, { unique: true });
      await usersCollection.createIndex({ role: 1 });
      await usersCollection.createIndex({ createdAt: -1 });
      console.log('✅ Users indexes created');
    } catch (error) {
      console.log('ℹ️ Users indexes already exist or error:', error.message);
    }

    // Auth Throttle Collection Indexes
    const authThrottleCollection = db.collection('auth_throttle');
    try {
      await authThrottleCollection.createIndex({ userId: 1 });
      await authThrottleCollection.createIndex({ lockUntil: 1 });
      await authThrottleCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // TTL: 24 hours
      console.log('✅ Auth Throttle indexes created');
    } catch (error) {
      console.log('ℹ️ Auth Throttle indexes already exist or error:', error.message);
    }

    // Auth IP Throttle Collection Indexes
    const authIpThrottleCollection = db.collection('auth_ip_throttle');
    try {
      await authIpThrottleCollection.createIndex({ ip: 1 });
      await authIpThrottleCollection.createIndex({ lockUntil: 1 });
      await authIpThrottleCollection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // TTL: 24 hours
      console.log('✅ Auth IP Throttle indexes created');
    } catch (error) {
      console.log('ℹ️ Auth IP Throttle indexes already exist or error:', error.message);
    }

    // Gate Logs Collection Indexes (if exists)
    try {
      const gateLogsCollection = db.collection('gateLogs');
      await gateLogsCollection.createIndex({ timestamp: -1 });
      await gateLogsCollection.createIndex({ type: 1 });
      await gateLogsCollection.createIndex({ recordedBy: 1 });
      await gateLogsCollection.createIndex({ timestamp: 1, type: 1 });
      console.log('✅ Gate Logs indexes created');
    } catch (error) {
      console.log('ℹ️ Gate Logs collection not found or indexes already exist, skipping');
    }

    console.log('🎉 All database indexes initialized successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error initializing database indexes:', error);
    return false;
  }
}

// Auto-initialize indexes when this module is imported
if (process.env.NODE_ENV === 'development') {
  initializeIndexes().catch(console.error);
}
