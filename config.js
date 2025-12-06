require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3019,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ReadCycle',
  
  // Session
  sessionSecret: process.env.SESSION_SECRET || 'your-super-secret-key-here',
  sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE, 10) || 24 * 60 * 60 * 1000, // 24 hours
  
  // Security
  trustProxy: process.env.TRUST_PROXY === '1',
  corsOrigin: process.env.CORS_ORIGIN || true,
  
  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100, // limit each IP to 100 requests per windowMs
  },
  
  // Validation
  passwordMinLength: 8,
  userid: {
    minLength: 3,
    maxLength: 20,
    regex: /^[a-zA-Z0-9]{3,20}$/
  },
  name: {
    minLength: 2,
    maxLength: 50,
    regex: /^[a-zA-Z\s\-']{2,50}$/
  },
  phone: {
    regex: /^[\+]?[1-9][\d]{0,15}$/
  },
  email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
};
