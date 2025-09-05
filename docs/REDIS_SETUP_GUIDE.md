# Comprehensive Redis Setup Guide

## Introduction

This guide provides detailed instructions for setting up Redis for the Govardhan Goshala application. Redis is a critical component that significantly improves API performance through caching and supports rate limiting functionality.

## Table of Contents

1. [Installation Options](#installation-options)
   - [Local Development Setup](#local-development-setup)
   - [Docker Setup](#docker-setup)
   - [Cloud Redis Setup](#cloud-redis-setup)
2. [Configuration](#configuration)
   - [Environment Variables](#environment-variables)
   - [Redis Configuration Options](#redis-configuration-options)
3. [Testing Your Setup](#testing-your-setup)
   - [Connection Test](#connection-test)
   - [Performance Test](#performance-test)
4. [Monitoring and Management](#monitoring-and-management)
   - [Redis CLI Commands](#redis-cli-commands)
   - [Monitoring Tools](#monitoring-tools)
5. [Troubleshooting](#troubleshooting)
   - [Common Issues](#common-issues)
   - [Debugging Steps](#debugging-steps)
6. [Production Considerations](#production-considerations)
   - [Security](#security)
   - [High Availability](#high-availability)
   - [Persistence](#persistence)
7. [Examples](#examples)
   - [Basic Caching Example](#basic-caching-example)
   - [Rate Limiting Example](#rate-limiting-example)

## Installation Options

### Local Development Setup

#### Windows

**Using Chocolatey (Recommended)**

```bash
# Install Chocolatey if not already installed (run in PowerShell as Administrator)
# See https://chocolatey.org/install for the latest instructions
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Redis using Chocolatey
choco install redis-64

# Start Redis server
redis-server
```

**Manual Installation**

1. Download the latest Redis for Windows from https://github.com/microsoftarchive/redis/releases
2. Extract the ZIP file to a location of your choice (e.g., `C:\Redis`)
3. Start Redis server:

```bash
C:\Redis\redis-server.exe
```

#### macOS

**Using Homebrew**

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Redis
brew install redis

# Start Redis server
brew services start redis
# Or run directly
redis-server
```

#### Linux (Ubuntu/Debian)

```bash
# Update package lists
sudo apt update

# Install Redis
sudo apt install redis-server

# Start Redis service
sudo systemctl start redis-server

# Enable Redis to start on boot
sudo systemctl enable redis-server
```

### Docker Setup

**Basic Redis Container**

```bash
# Run Redis in Docker
docker run -d --name redis-cache -p 6379:6379 redis:alpine
```

**Redis with Persistence**

```bash
# Run Redis with persistence enabled
docker run -d --name redis-cache -p 6379:6379 -v redis-data:/data redis:alpine redis-server --appendonly yes
```

**Using Docker Compose**

Create a `docker-compose.yml` file:

```yaml
version: '3'

services:
  redis:
    image: redis:alpine
    container_name: redis-cache
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

volumes:
  redis-data:
```

Then run:

```bash
docker-compose up -d
```

### Cloud Redis Setup

#### Redis Cloud

1. Sign up for a free account at https://redis.com/try-free/
2. Create a new subscription
3. Create a new database
4. Note the endpoint and password

#### AWS ElastiCache

1. Log in to AWS Console
2. Navigate to ElastiCache
3. Create a new Redis cluster
4. Configure VPC and security groups
5. Note the endpoint and port

#### Azure Cache for Redis

1. Log in to Azure Portal
2. Create a new Azure Cache for Redis instance
3. Select pricing tier (Basic for development)
4. Note the host name, port, and access key

## Configuration

### Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_URL=redis://localhost:6379

# For Upstash Redis REST API (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

For cloud Redis services, update the values accordingly:

```env
# Redis Cloud Example
REDIS_HOST=redis-12345.c12345.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-password-here
REDIS_DB=0
REDIS_URL=redis://default:your-password-here@redis-12345.c12345.us-east-1-1.ec2.cloud.redislabs.com:12345
```

### Redis Configuration Options

The application's Redis configuration is defined in `lib/redis.js`:

```javascript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  family: 4,
  keepAlive: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Connection pool settings
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableOfflineQueue: false,
};
```

You can customize these options by modifying the environment variables or the configuration object directly.

## Testing Your Setup

### Connection Test

**Using Redis CLI**

```bash
# Connect to Redis CLI
redis-cli

# Check if Redis is running
ping
# Should respond with PONG

# Exit Redis CLI
exit
```

**Using the Application Test Endpoint**

1. Start your development server:

```bash
npm run dev
```

2. Navigate to `/api/test-redis` in your browser or use curl:

```bash
curl http://localhost:3000/api/test-redis
```

3. Check the response for connection status and test data

### Performance Test

You can test the performance improvement by comparing API response times with and without Redis caching:

1. Clear Redis cache:

```bash
redis-cli flushall
```

2. Make a request to an API endpoint and measure the response time (first request, no cache):

```bash
time curl http://localhost:3000/api/food/inventory
```

3. Make the same request again and measure the response time (cached response):

```bash
time curl http://localhost:3000/api/food/inventory
```

4. Compare the response times to see the performance improvement

## Monitoring and Management

### Redis CLI Commands

**Connect to Redis CLI**

```bash
# Local Redis
redis-cli

# Remote Redis with password
redis-cli -h your-redis-host -p 6379 -a your-password
```

**Useful Commands**

```bash
# Check Redis info
info

# Get memory usage
info memory

# Get keyspace info
info keyspace

# List all keys
keys *

# List keys by pattern
keys food:*

# Get value of a key
get "food:inventory:{\"page\":1,\"limit\":20}"

# Delete a key
del "food:inventory:{\"page\":1,\"limit\":20}"

# Delete keys by pattern
eval "for _,k in ipairs(redis.call('keys',ARGV[1])) do redis.call('del',k) end" 0 "food:*"

# Monitor Redis commands in real-time
monitor

# Check client connections
client list

# Clear all data
flushall
```

### Monitoring Tools

**Redis Commander**

A web-based Redis management tool:

```bash
# Install Redis Commander
npm install -g redis-commander

# Start Redis Commander
redis-commander
```

Then open http://localhost:8081 in your browser.

**RedisInsight**

A graphical tool for Redis management:

1. Download from https://redis.com/redis-enterprise/redis-insight/
2. Install and run the application
3. Connect to your Redis instance

## Troubleshooting

### Common Issues

**Redis Not Starting**

```bash
# Check if port 6379 is already in use
netstat -an | findstr 6379

# Kill process using port 6379
taskkill /f /pid <PID>
```

**Connection Refused**

1. Verify Redis is running:

```bash
redis-cli ping
```

2. Check environment variables are correctly set
3. Ensure firewall is not blocking the connection

**Authentication Failed**

1. Verify the password in your environment variables
2. Test connection with explicit password:

```bash
redis-cli -a your-password ping
```

**Memory Issues**

1. Check Redis memory usage:

```bash
redis-cli info memory
```

2. Consider enabling Redis maxmemory and eviction policy:

```bash
config set maxmemory 100mb
config set maxmemory-policy allkeys-lru
```

### Debugging Steps

1. **Check Redis Connection**

```javascript
import { redis } from '@/lib/redis';

async function checkRedisConnection() {
  try {
    await redis.ping();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Redis connection error:', error);
  }
}
```

2. **Test Cache Operations**

```javascript
import { cache } from '@/lib/redisCache';

async function testCacheOperations() {
  try {
    // Set a test value
    await cache.set('test:key', { value: 'test' }, 60);
    console.log('Set test value in cache');
    
    // Get the test value
    const value = await cache.get('test:key');
    console.log('Retrieved test value:', value);
    
    // Delete the test value
    await cache.del('test:key');
    console.log('Deleted test value');
  } catch (error) {
    console.error('Cache operation error:', error);
  }
}
```

3. **Enable Debug Logging**

Set the `DEBUG` environment variable to enable Redis debug logging:

```env
DEBUG=ioredis:*
```

## Production Considerations

### Security

1. **Password Protection**

Always set a strong password for Redis in production:

```bash
# In redis.conf
requirepass your-strong-password
```

2. **Network Security**

Bind Redis to localhost or use a private network:

```bash
# In redis.conf
bind 127.0.0.1
```

3. **TLS Encryption**

For Redis 6.0+, enable TLS:

```bash
# In redis.conf
tls-port 6380
tls-cert-file /path/to/cert.crt
tls-key-file /path/to/cert.key
tls-ca-cert-file /path/to/ca.crt
```

### High Availability

1. **Redis Sentinel**

Set up Redis Sentinel for automatic failover:

```bash
# Run Redis Sentinel
redis-server /path/to/sentinel.conf --sentinel
```

Sentinel configuration example:

```
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
```

2. **Redis Cluster**

For horizontal scaling, set up a Redis Cluster:

```bash
# Create a cluster
redis-cli --cluster create 127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 --cluster-replicas 1
```

### Persistence

1. **RDB Persistence**

Configure point-in-time snapshots:

```bash
# In redis.conf
save 900 1
save 300 10
save 60 10000
dbfilename dump.rdb
dir /var/lib/redis
```

2. **AOF Persistence**

Enable append-only file for durability:

```bash
# In redis.conf
appendonly yes
appendfsync everysec
```

## Examples

### Basic Caching Example

```javascript
import { cache, CacheKeys } from '@/lib/redisCache';

// API route handler with caching
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page') || 1;
  const limit = searchParams.get('limit') || 20;
  
  // Generate cache key
  const cacheKey = CacheKeys.FOOD_INVENTORY({ page, limit });
  
  // Try to get from cache
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log('Cache hit for food inventory');
    return Response.json(cached);
  }
  
  console.log('Cache miss for food inventory');
  
  // Fetch data from database
  const data = await fetchFoodInventoryFromDB(page, limit);
  
  // Cache the result (10 minutes TTL)
  await cache.set(cacheKey, data, 600);
  
  return Response.json(data);
}
```

### Rate Limiting Example

```javascript
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';

// Create a rate limiter (30 requests per minute)
const limiter = rateLimit();

// API route handler with rate limiting
export async function GET(request) {
  // Generate rate limit key from request
  const key = rateLimitKeyFromRequest(request);
  
  // Check rate limit
  const { limited, remaining, resetTime } = await limiter(key);
  
  // If rate limited, return 429 Too Many Requests
  if (limited) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000),
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': remaining.toString(),
        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
      }
    });
  }
  
  // Process the request normally
  const data = await fetchData();
  
  // Add rate limit headers to response
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-RateLimit-Limit': '30',
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString()
    }
  });
}
```

---

By following this guide, you should have a fully functional Redis setup for your Govardhan Goshala application. Redis will significantly improve API performance through caching and provide robust rate limiting capabilities.