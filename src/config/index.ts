import dotenv from 'dotenv';

// Only load .env file if not in test mode (tests set env vars directly)
if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

export const config = {
  get port() { return parseInt(process.env.PORT || '3000', 10); },
  get nodeEnv() { return process.env.NODE_ENV || 'development'; },
  get baseUrl() { return process.env.BASE_URL || 'http://localhost:3000'; },
  get apiBaseUrl() { return process.env.API_BASE_URL || 'http://localhost:3000'; },
  get databaseUrl() { return process.env.DATABASE_URL || ''; },
  get logLevel() { return process.env.LOG_LEVEL || 'info'; },
  get apiKey() { return process.env.API_KEY || ''; },
  get jwtSecret() { return process.env.JWT_SECRET || ''; },
  get jwtExpiration() { return process.env.JWT_EXPIRATION || '24h'; },
  // Rate limiting configuration
  get rateLimitWindowMs() { return parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); }, // Default: 1 minute
  get rateLimitMaxRequests() { return parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '60', 10); }, // Default: 60 requests
  // Email service configuration
  smtp: {
    get host() { return process.env.SMTP_HOST || ''; },
    get port() { return parseInt(process.env.SMTP_PORT || '587', 10); },
    get secure() { return process.env.SMTP_SECURE === 'true'; },
    get user() { return process.env.SMTP_USER || ''; },
    get password() { return process.env.SMTP_PASSWORD || ''; },
    get from() { return process.env.SMTP_FROM || 'noreply@example.com'; },
  },
};

// Validate API key configuration
// This function should be called during application startup
export function validateApiKeyConfig(logger: any): void {
  if (!config.apiKey) {
    logger.warn('API_KEY not set - all protected endpoints will be inaccessible');
  } else if (config.apiKey.length < 32) {
    logger.warn('API_KEY is shorter than recommended 32 characters');
  }
}

// Validate JWT configuration
// This function should be called during application startup
export function validateJwtConfig(logger: any): void {
  if (!config.jwtSecret) {
    logger.warn('JWT_SECRET not set - authentication will not work');
  } else if (config.jwtSecret.length < 32) {
    logger.warn('JWT_SECRET is shorter than recommended 32 characters');
  }
}

// Validate email service configuration
// This function should be called during application startup
export function validateEmailConfig(logger: any): void {
  if (!config.smtp.host) {
    logger.warn('SMTP_HOST not set - email service will not work');
  }
  if (!config.smtp.user) {
    logger.warn('SMTP_USER not set - email service will not work');
  }
  if (!config.smtp.password) {
    logger.warn('SMTP_PASSWORD not set - email service will not work');
  }
}
