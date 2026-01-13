import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { UnauthorizedError, InvalidApiKeyError } from './errorHandler';
import logger from '../utils/logger';

// Public endpoints that don't require authentication
// JWT-protected endpoints are also excluded from API key auth
const PUBLIC_ENDPOINTS = [
  { method: 'GET', pattern: /^\/[^/]+$/ }, // GET /:shortCode
  { method: 'POST', pattern: /^\/api\/tracking\/click$/ },
  { method: 'POST', pattern: /^\/api\/webhook\/conversion$/ },
  { method: 'POST', pattern: /^\/api\/webhook\/conversion\/shopify$/ }, // Shopify webhook
  { method: 'POST', pattern: /^\/api\/auth\/register$/ }, // Auth endpoints
  { method: 'POST', pattern: /^\/api\/auth\/login$/ },
  { method: 'POST', pattern: /^\/api\/auth\/refresh$/ },
  { method: 'POST', pattern: /^\/api\/auth\/confirm-email$/ }, // Email confirmation
  { method: 'POST', pattern: /^\/api\/auth\/request-password-reset$/ }, // Password reset request
  { method: 'POST', pattern: /^\/api\/auth\/reset-password$/ }, // Password reset completion
  { method: 'PATCH', pattern: /^\/api\/auth\/change-password$/ }, // Change password (JWT-protected)
  { method: 'POST', pattern: /^\/api\/profile\/confirm-email-change$/ }, // Email change confirmation (public)
  { method: 'GET', pattern: /^\/health$/ },
  { method: 'HEAD', pattern: /^\/health$/ }, // Health check (for Docker)
  { method: 'GET', pattern: /^\/$/ }, // Root endpoint
  { method: 'GET', pattern: /^\/api\/cors-test$/ }, // CORS test endpoint
  // JWT-protected endpoints (use JWT auth instead of API key)
  { method: 'GET', pattern: /^\/api\/short-urls/ },
  { method: 'POST', pattern: /^\/api\/short-urls/ },
  { method: 'PUT', pattern: /^\/api\/short-urls/ },
  { method: 'PATCH', pattern: /^\/api\/short-urls/ },
  { method: 'DELETE', pattern: /^\/api\/short-urls/ },
  { method: 'GET', pattern: /^\/api\/users/ },
  { method: 'GET', pattern: /^\/api\/profile/ }, // Profile endpoints (JWT-protected)
  { method: 'POST', pattern: /^\/api\/profile/ }, // Profile endpoints (JWT-protected)
  { method: 'DELETE', pattern: /^\/api\/profile/ }, // Profile endpoints (JWT-protected)
  { method: 'GET', pattern: /^\/api\/analytics/ }, // Analytics endpoints (JWT-protected)
  { method: 'POST', pattern: /^\/api\/validate-url$/ }, // URL validation endpoint (JWT-protected)
  // Banner and notification endpoints (JWT-protected)
  { method: 'GET', pattern: /^\/api\/banners/ },
  { method: 'POST', pattern: /^\/api\/banners/ },
  { method: 'PUT', pattern: /^\/api\/banners/ },
  { method: 'DELETE', pattern: /^\/api\/banners/ },
  { method: 'POST', pattern: /^\/api\/toasts/ },
  { method: 'GET', pattern: /^\/api\/sse$/ }, // SSE endpoint
  // Admin endpoints (JWT-protected)
  { method: 'GET', pattern: /^\/api\/admin/ },
  { method: 'POST', pattern: /^\/api\/admin/ },
  { method: 'PUT', pattern: /^\/api\/admin/ },
  { method: 'PATCH', pattern: /^\/api\/admin/ },
  { method: 'DELETE', pattern: /^\/api\/admin/ },
  // Account endpoints (JWT-protected)
  { method: 'GET', pattern: /^\/api\/account/ },
  { method: 'POST', pattern: /^\/api\/account/ },
  { method: 'PUT', pattern: /^\/api\/account/ },
  { method: 'PATCH', pattern: /^\/api\/account/ },
  { method: 'DELETE', pattern: /^\/api\/account/ },
];

/**
 * Checks if the current request matches a public endpoint pattern
 */
function isPublicEndpoint(method: string, path: string): boolean {
  return PUBLIC_ENDPOINTS.some(
    (endpoint) => endpoint.method === method && endpoint.pattern.test(path)
  );
}

/**
 * API Key Authentication Middleware
 * Validates API key from X-API-Key header for protected endpoints
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const method = req.method;
  const path = req.path;

  // Check if this is a public endpoint
  if (isPublicEndpoint(method, path)) {
    return next();
  }

  // Extract API key from headers (case-insensitive)
  const apiKey = Object.keys(req.headers).reduce((found, key) => {
    if (key.toLowerCase() === 'x-api-key') {
      return req.headers[key] as string;
    }
    return found;
  }, '');

  // Check if API key is present
  if (!apiKey) {
    logger.warn('Authentication failure: Missing API key', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    throw new UnauthorizedError();
  }

  // Validate API key
  if (apiKey !== config.apiKey) {
    logger.warn('Authentication failure: Invalid API key', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
    throw new InvalidApiKeyError();
  }

  // Log successful authentication at debug level
  logger.debug('Authentication successful', {
    path: req.path,
    method: req.method,
  });

  next();
}
