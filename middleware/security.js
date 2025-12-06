const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const config = require('../config');

// Security headers middleware
const securityHeaders = [
  helmet(),
  helmet.xssFilter(),
  helmet.noSniff(),
  helmet.hidePoweredBy(),
  helmet.frameguard({ action: 'deny' }),
  helmet.hsts({
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }),
  helmet.referrerPolicy({ policy: 'same-origin' }),
  helmet.permittedCrossDomainPolicies(),
  (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  }
];

// Rate limiting middleware
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS configuration
const corsOptions = {
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

// CSRF protection middleware
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API routes if using JWT
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  // For non-API routes, we'll use the csurf middleware
  // This is a placeholder - actual implementation would depend on your view engine
  next();
};

// Request validation middleware
const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: error.details.map(detail => detail.message).join(', ')
      });
    }
    next();
  };
};

module.exports = {
  securityHeaders,
  apiLimiter,
  corsOptions,
  csrfProtection,
  validateRequest
};
