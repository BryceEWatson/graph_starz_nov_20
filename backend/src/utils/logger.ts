import winston from 'winston';
import { config } from '../config/env.js';

const logLevel = config.nodeEnv === 'production' ? 'info' : 'debug';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Create winston logger
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'graph-starz-backend' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: config.nodeEnv === 'production' ? logFormat : consoleFormat,
    }),

    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // File transport for combined logs (not in test)
    ...(config.nodeEnv !== 'test'
      ? [
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

// Silence logger during tests unless explicitly enabled
if (config.nodeEnv === 'test' && !process.env.LOG_TESTS) {
  logger.silent = true;
}