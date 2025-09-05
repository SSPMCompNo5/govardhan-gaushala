#!/usr/bin/env node

/**
 * Govardhan Goshala - Setup Validation Script
 * This script checks if everything is properly configured for your friend
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🐄 Govardhan Goshala - Setup Validation\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkDocker() {
  log('🔍 Checking Docker installation...', 'blue');
  try {
    const version = execSync('docker --version', { encoding: 'utf8' });
    log(`✅ Docker installed: ${version.trim()}`, 'green');
    
    const info = execSync('docker info', { encoding: 'utf8' });
    if (info.includes('Server Version')) {
      log('✅ Docker is running', 'green');
      return true;
    } else {
      log('❌ Docker is not running. Please start Docker Desktop.', 'red');
      return false;
    }
  } catch (error) {
    log('❌ Docker not found. Please install Docker Desktop.', 'red');
    return false;
  }
}

function checkDockerCompose() {
  log('🔍 Checking Docker Compose...', 'blue');
  try {
    const version = execSync('docker-compose --version', { encoding: 'utf8' });
    log(`✅ Docker Compose available: ${version.trim()}`, 'green');
    return true;
  } catch (error) {
    log('❌ Docker Compose not found.', 'red');
    return false;
  }
}

function checkEnvironmentFile() {
  log('🔍 Checking environment configuration...', 'blue');
  
  const envFile = path.join(process.cwd(), '.env.local');
  const envExample = path.join(process.cwd(), 'env.friend.example');
  
  if (!fs.existsSync(envFile)) {
    if (fs.existsSync(envExample)) {
      log('⚠️  .env.local not found. Copying from template...', 'yellow');
      try {
        fs.copyFileSync(envExample, envFile);
        log('✅ Created .env.local from template', 'green');
        log('📝 Please edit .env.local with your configuration', 'yellow');
        return false;
      } catch (error) {
        log('❌ Failed to create .env.local', 'red');
        return false;
      }
    } else {
      log('❌ No environment file found. Please create .env.local', 'red');
      return false;
    }
  }
  
  const envContent = fs.readFileSync(envFile, 'utf8');
  
  // Check for default secrets
  if (envContent.includes('your-random-secret-key-change-this-please')) {
    log('⚠️  Please change JWT_SECRET and NEXTAUTH_SECRET in .env.local', 'yellow');
    return false;
  }
  
  // Check for MongoDB URI
  if (!envContent.includes('MONGODB_URI=')) {
    log('❌ MONGODB_URI not found in .env.local', 'red');
    return false;
  }
  
  log('✅ Environment file looks good', 'green');
  return true;
}

function checkPorts() {
  log('🔍 Checking port availability...', 'blue');
  
  const ports = [3000, 27017, 6379, 8081, 8082];
  const occupiedPorts = [];
  
  for (const port of ports) {
    try {
      const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
      if (result.trim()) {
        occupiedPorts.push(port);
      }
    } catch (error) {
      // Port is free
    }
  }
  
  if (occupiedPorts.length > 0) {
    log(`⚠️  Ports in use: ${occupiedPorts.join(', ')}`, 'yellow');
    log('   You may need to stop conflicting services', 'yellow');
    return false;
  }
  
  log('✅ All required ports are available', 'green');
  return true;
}

function checkDockerImages() {
  log('🔍 Checking Docker images...', 'blue');
  
  try {
    const images = execSync('docker images', { encoding: 'utf8' });
    
    const requiredImages = [
      'mongo:7.0',
      'redis:7-alpine',
      'mongo-express:1.0.0',
      'rediscommander/redis-commander:latest'
    ];
    
    let allImagesPresent = true;
    
    for (const image of requiredImages) {
      if (images.includes(image)) {
        log(`✅ ${image} is available`, 'green');
      } else {
        log(`⚠️  ${image} will be downloaded on first run`, 'yellow');
        allImagesPresent = false;
      }
    }
    
    return true; // Images will be pulled automatically
  } catch (error) {
    log('❌ Failed to check Docker images', 'red');
    return false;
  }
}

function checkProjectFiles() {
  log('🔍 Checking project files...', 'blue');
  
  const requiredFiles = [
    'docker-compose.yml',
    'Dockerfile',
    'package.json',
    'next.config.js'
  ];
  
  let allFilesPresent = true;
  
  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      log(`✅ ${file} found`, 'green');
    } else {
      log(`❌ ${file} not found`, 'red');
      allFilesPresent = false;
    }
  }
  
  return allFilesPresent;
}

function generateQuickStart() {
  log('\n🚀 Quick Start Commands:', 'bold');
  log('1. Start all services:', 'blue');
  log('   npm run docker:up', 'green');
  log('');
  log('2. Check status:', 'blue');
  log('   docker-compose ps', 'green');
  log('');
  log('3. View logs:', 'blue');
  log('   npm run docker:logs', 'green');
  log('');
  log('4. Access application:', 'blue');
  log('   http://localhost:3000', 'green');
  log('');
  log('5. Stop services:', 'blue');
  log('   npm run docker:down', 'green');
}

function main() {
  const checks = [
    { name: 'Docker Installation', fn: checkDocker },
    { name: 'Docker Compose', fn: checkDockerCompose },
    { name: 'Project Files', fn: checkProjectFiles },
    { name: 'Environment Configuration', fn: checkEnvironmentFile },
    { name: 'Port Availability', fn: checkPorts },
    { name: 'Docker Images', fn: checkDockerImages }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const passed = check.fn();
    if (!passed) {
      allPassed = false;
    }
    console.log('');
  }
  
  if (allPassed) {
    log('🎉 All checks passed! You\'re ready to start the application.', 'green');
    generateQuickStart();
  } else {
    log('⚠️  Some checks failed. Please fix the issues above before starting.', 'yellow');
    log('📖 See FRIEND_SETUP_GUIDE.md for detailed instructions.', 'blue');
  }
  
  console.log('');
  log('📚 For help, check:', 'blue');
  log('   - FRIEND_SETUP_GUIDE.md (comprehensive guide)', 'green');
  log('   - DOCKER_SETUP.md (technical details)', 'green');
  log('   - README.md (project overview)', 'green');
}

// Run the validation
main();
