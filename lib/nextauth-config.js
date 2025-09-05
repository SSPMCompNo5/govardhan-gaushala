// NextAuth Configuration Check
// This file ensures all required environment variables are set for NextAuth

export function validateNextAuthConfig() {
  const requiredVars = [
    'NEXTAUTH_SECRET',
    'MONGODB_URI',
    'MONGODB_DB'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️ Missing NextAuth environment variables:', missingVars.join(', '));
    console.warn('Please set these variables in your .env file');
    return false;
  }

  // Check if NEXTAUTH_URL is set (recommended for production)
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_URL) {
    console.warn('⚠️ NEXTAUTH_URL not set for production environment');
  }

  return true;
}

// Auto-validate on import
if (typeof window === 'undefined') {
  validateNextAuthConfig();
}
