/**
 * Test login flow to verify authentication is working
 */

async function testLogin() {
  console.log('🧪 Testing Login Flow\n');
  
  try {
    // Test 1: Check if MongoDB connection works
    console.log('1️⃣ Testing MongoDB connection...');
    const { default: clientPromise } = await import('./lib/mongo.js');
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'goshala');
    
    const user = await db.collection('users').findOne({ userId: 'admin' });
    if (user) {
      console.log('✅ MongoDB connected - Admin user found');
      console.log(`   User ID: ${user.userId}, Role: ${user.role}`);
    } else {
      console.log('❌ Admin user not found in database');
      process.exit(1);
    }
    
    // Test 2: Verify password hash
    console.log('\n2️⃣ Testing password verification...');
    const bcrypt = await import('bcryptjs');
    const passwordMatch = await bcrypt.default.compare('admin123', user.passwordHash);
    if (passwordMatch) {
      console.log('✅ Password verification works');
    } else {
      console.log('❌ Password verification failed');
      process.exit(1);
    }
    
    // Test 3: Check JWT secrets
    console.log('\n3️⃣ Checking environment variables...');
    if (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'your-random-secret-key-change-this-please') {
      console.log('✅ JWT_SECRET is configured');
    } else {
      console.log('❌ JWT_SECRET not configured properly');
      process.exit(1);
    }
    
    if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET !== 'your-random-secret-key-change-this-please') {
      console.log('✅ NEXTAUTH_SECRET is configured');
    } else {
      console.log('❌ NEXTAUTH_SECRET not configured properly');
      process.exit(1);
    }
    
    if (process.env.NEXTAUTH_URL) {
      console.log(`✅ NEXTAUTH_URL is set to: ${process.env.NEXTAUTH_URL}`);
    } else {
      console.log('❌ NEXTAUTH_URL not configured');
    }
    
    console.log('\n✅ All checks passed! Login should work.');
    console.log('\n📝 Try logging in with:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('\n🌐 Go to: http://localhost:3000/login');
    
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();
