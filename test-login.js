#!/usr/bin/env node

/**
 * Test login functionality with proper CSRF handling
 */

const https = require('https');
const http = require('http');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testLogin() {
  try {
    console.log('🔐 Testing Login Functionality');
    console.log('==============================');
    
    // Step 1: Get CSRF token
    console.log('1️⃣ Getting CSRF token...');
    const csrfResponse = await makeRequest('http://localhost:3000/api/auth/csrf');
    
    if (csrfResponse.statusCode !== 200) {
      console.log('❌ Failed to get CSRF token');
      return;
    }
    
    const csrfData = JSON.parse(csrfResponse.data);
    const csrfToken = csrfData.csrfToken;
    console.log(`✅ CSRF token: ${csrfToken.substring(0, 20)}...`);
    
    // Step 2: Test authentication
    console.log('');
    console.log('2️⃣ Testing authentication...');
    
    const loginData = new URLSearchParams({
      csrfToken: csrfToken,
      userId: 'admin',
      password: 'admin123',
      remember: 'false'
    });
    
    const loginResponse = await makeRequest('http://localhost:3000/api/auth/callback/credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': csrfResponse.headers['set-cookie']?.join('; ') || ''
      },
      body: loginData.toString()
    });
    
    console.log(`Status: ${loginResponse.statusCode}`);
    console.log(`Location: ${loginResponse.headers.location || 'None'}`);
    
    if (loginResponse.statusCode === 302) {
      console.log('✅ Authentication successful (redirected)');
    } else {
      console.log('❌ Authentication failed');
      console.log('Response:', loginResponse.data);
    }
    
    // Step 3: Test session
    console.log('');
    console.log('3️⃣ Testing session...');
    
    const sessionResponse = await makeRequest('http://localhost:3000/api/auth/session', {
      headers: {
        'Cookie': loginResponse.headers['set-cookie']?.join('; ') || ''
      }
    });
    
    if (sessionResponse.statusCode === 200) {
      const sessionData = JSON.parse(sessionResponse.data);
      if (sessionData.user) {
        console.log('✅ Session active');
        console.log(`   User: ${sessionData.user.userId}`);
        console.log(`   Role: ${sessionData.user.role}`);
      } else {
        console.log('❌ No active session');
      }
    } else {
      console.log('❌ Failed to get session');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testLogin().catch(console.error);
}

module.exports = { testLogin };
