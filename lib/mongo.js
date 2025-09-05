import 'server-only';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('Missing MONGODB_URI in environment');
}

// Build options based on environment to support both local (no TLS) and cloud (TLS)
function buildOptions() {
  const opts = { 
    ignoreUndefined: true,
    // Performance optimizations
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    // Connection pool settings
    minPoolSize: 2, // Maintain a minimum of 2 socket connections
    maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
    connectTimeoutMS: 10000, // Give up initial connection after 10 seconds
  };

  // Explicit flags (string booleans) to control TLS/DirectConnection
  const tlsEnv = (process.env.MONGODB_TLS || '').toLowerCase();
  const allowInvalidEnv = (process.env.MONGODB_TLS_ALLOW_INVALID || '').toLowerCase();
  const directEnv = (process.env.MONGODB_DIRECT || '').toLowerCase();

  if (tlsEnv === 'true') opts.tls = true;
  if (tlsEnv === 'false') opts.tls = false;
  if (allowInvalidEnv === 'true') opts.tlsAllowInvalidCertificates = true;
  if (directEnv === 'true') opts.directConnection = true;

  // Heuristic: local connection defaults to no TLS unless explicitly enabled
  if (!('tls' in opts)) {
    try {
      const isLocal = uri.startsWith('mongodb://localhost') || uri.startsWith('mongodb://127.0.0.1');
      if (isLocal) opts.tls = false;
    } catch {}
  }

  return opts;
}

let client;
let clientPromise;

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(uri, buildOptions());
  }
  client = global._mongoClient;
  clientPromise = client.connect();
} else {
  client = new MongoClient(uri, buildOptions());
  clientPromise = client.connect();
}

export default clientPromise;
