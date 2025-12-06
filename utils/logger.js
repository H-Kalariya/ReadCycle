const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, json } = format;
const path = require('path');
const config = require('../config');

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (stack) {
    msg += `\n${stack}`;
  }
  return msg;
});

// Custom format for file output
const fileFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  const metaString = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp} [${level.toUpperCase()}]: ${message}${metaString}${stack ? `\n${stack}` : ''}`;
});

// Create logger instance
const logger = createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',  // Log more levels in development
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    config.nodeEnv === 'production' ? json() : combine(colorize(), consoleFormat)
  ),
  defaultMeta: { service: 'readcycle-api' },
  transports: [
    // Write all logs with level 'error' and below to 'error.log'
    new transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: combine(timestamp(), fileFormat)
    }),
    // Write all logs with level 'info' and below to 'combined.log'
    new transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: combine(timestamp(), fileFormat)
    })
  ]
});

// If we're not in production, also log to console
if (config.nodeEnv !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      consoleFormat
    )
  }));
}

// Create a stream object for morgan to use
logger.stream = {
  write: (message) => {
    logger.info(message.trim());
  }
};

// Handle uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // In production, you might want to restart the process here
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to restart the process here
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

module.exports = logger;
