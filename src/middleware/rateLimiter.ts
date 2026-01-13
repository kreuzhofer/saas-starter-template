import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import logger from '../utils/logger';
import { AuthRequest } from './jwtAuth';

// In test environment, skip successful requests to allow property tests to run
const isTestEnvironment = process.env.NODE_ENV === 'test';

// Disable validation to avoid trust proxy warnings
// Users should configure trust proxy properly for their deployment
const skipValidation = { trustProxy: false };

/**
 * Rate limiter for URL validation endpoint
 * Limits to 10 requests per minute per user
 */
export const validateUrlRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window per user
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: skipValidation, // Disable trust proxy validation
  
  // Use account ID as the key for rate limiting
  keyGenerator: (req: Request): string => {
    const authReq = req as AuthRequest;
    // Use account ID if available, otherwise fall back to IP
    if (authReq.account?.id) {
      return `account:${authReq.account.id}`;
    }
    // For IP-based rate limiting, return the IP directly
    // express-rate-limit will handle IPv6 normalization
    return `ip:${req.ip || 'anonymous'}`;
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response): void => {
    const authReq = req as AuthRequest;
    logger.warn('Rate limit exceeded for URL validation', {
      accountId: authReq.account?.id,
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60, // seconds
    });
  },
  
  // Skip rate limiting for failed requests (e.g., authentication failures)
  skipFailedRequests: true,
  
  // In test environment, skip successful requests to allow property tests
  // In production, count all successful requests
  skipSuccessfulRequests: isTestEnvironment,
});

/**
 * Rate limiter for recheck endpoint
 * Limits to 1 request per minute per link
 */
export const recheckRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // 1 request per window per link
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: skipValidation, // Disable trust proxy validation
  
  // Use short URL ID as the key for rate limiting
  keyGenerator: (req: Request): string => {
    const authReq = req as AuthRequest;
    const shortUrlId = req.params.id;
    // Combine account ID and short URL ID to rate limit per link per user
    if (authReq.account?.id && shortUrlId) {
      return `recheck:${authReq.account.id}:${shortUrlId}`;
    }
    // Fallback to IP + short URL ID
    return `recheck:${req.ip || 'anonymous'}:${shortUrlId || 'unknown'}`;
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response): void => {
    const authReq = req as AuthRequest;
    logger.warn('Rate limit exceeded for recheck', {
      accountId: authReq.account?.id,
      ip: req.ip,
      path: req.path,
      shortUrlId: req.params.id,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'You can only recheck a link once per minute. Please try again later.',
      retryAfter: 60, // seconds
    });
  },
  
  // Skip rate limiting for failed requests (e.g., authentication failures)
  skipFailedRequests: true,
  
  // In test environment, skip successful requests to allow property tests
  // In production, count all successful requests
  skipSuccessfulRequests: isTestEnvironment,
});

/**
 * Rate limiter for country health check endpoint
 * Limits to 100 requests per minute per user
 * 
 * Note: This endpoint now reads from the database (no expensive validation),
 * so we can allow much higher limits to support normal user browsing behavior.
 * Users may refresh the details page multiple times or navigate between URLs quickly.
 */
export const countryHealthRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window per user
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: skipValidation, // Disable trust proxy validation
  
  // Use account ID as the key for rate limiting
  keyGenerator: (req: Request): string => {
    const authReq = req as AuthRequest;
    // Use account ID if available, otherwise fall back to IP
    if (authReq.account?.id) {
      return `account:${authReq.account.id}`;
    }
    // For IP-based rate limiting, return the IP directly
    // express-rate-limit will handle IPv6 normalization
    return `ip:${req.ip || 'anonymous'}`;
  },
  
  // Custom handler for rate limit exceeded
  handler: (req: Request, res: Response): void => {
    const authReq = req as AuthRequest;
    logger.warn('Rate limit exceeded for country health check', {
      accountId: authReq.account?.id,
      ip: req.ip,
      path: req.path,
      shortUrlId: req.params.id,
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: 60, // seconds
    });
  },
  
  // Skip rate limiting for failed requests (e.g., authentication failures)
  skipFailedRequests: true,
  
  // In test environment, skip successful requests to allow property tests
  // In production, count all successful requests
  skipSuccessfulRequests: isTestEnvironment,
});
