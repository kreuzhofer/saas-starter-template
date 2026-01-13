import express from 'express';
import cors from 'cors';
import { config, validateApiKeyConfig, validateJwtConfig, validateEmailConfig } from './config';
import logger from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { apiKeyAuth } from './middleware/apiKeyAuth';
import prisma from './db/client';
import { verifyEmailService } from './services/email';
import { initializeI18n } from './i18n/config';
import { registerTranslationHelper } from './i18n/handlebarsHelper';
import { scheduler } from './scheduler';
import { exampleTask } from './tasks/example';
import { overrideCleanupTask } from './tasks/overrideCleanup';

// Validate configuration on startup
validateApiKeyConfig(logger);
validateJwtConfig(logger);
validateEmailConfig(logger);

// Initialize i18n and register Handlebars helper
initializeI18n()
  .then(() => {
    registerTranslationHelper();
  })
  .catch((err) => {
    logger.error('Failed to initialize i18n on startup', { error: err });
    process.exit(1);
  });

// Verify email service connection
verifyEmailService().catch((err) => {
  logger.error('Failed to verify email service on startup', { error: err });
});

const app = express();

// Trust proxy - required for getting real client IP when behind reverse proxy/Docker
// This enables Express to read X-Forwarded-* headers
app.set('trust proxy', true);

// Middleware
// Configure CORS to allow requests from the frontend
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Allow all origins in development
    if (config.nodeEnv === 'development') {
      return callback(null, true);
    }

    // In production, check against allowed origins
    const allowedOrigins = [config.baseUrl, config.apiBaseUrl];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS: Blocking request from unauthorized origin', { 
        rejectedOrigin: origin, 
        allowedOrigins,
        nodeEnv: config.nodeEnv,
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  maxAge: 86400, // 24 hours
};

logger.info('CORS configuration initialized', { 
  allowedOrigins: [config.baseUrl, config.apiBaseUrl],
  nodeEnv: config.nodeEnv 
});

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// API Key Authentication
app.use(apiKeyAuth);

// Language detection middleware
import { languageDetection } from './middleware/languageDetection';
app.use(languageDetection);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

// CORS test endpoint (no auth required)
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
  });
});

// API routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import configRoutes from './routes/config';
import adminRoutes from './routes/admin';
import accountRoutes from './routes/account';
import bannerRoutes from './routes/banner';
import toastRoutes from './routes/toast';
import { sseEndpoint } from './controllers/banner';
import { optionalAuth } from './middleware/jwtAuth';

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/config', configRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/account', accountRoutes);

// SSE endpoint for real-time notifications (must be BEFORE /api/banners to avoid route conflicts)
app.get('/api/sse', optionalAuth, sseEndpoint);

app.use('/api/banners', bannerRoutes);
app.use('/api/toasts', toastRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'SaaS Starter Template API',
    version: '1.0.0',
  });
});

// Error handler (must be last)
app.use(errorHandler);

// Start server
const server = app.listen(config.port, async () => {
  logger.info(`Server started`, {
    port: config.port,
    env: config.nodeEnv,
    baseUrl: config.baseUrl,
  });

  // Initialize and start task scheduler
  try {
    // Register example task
    scheduler.registerTask(exampleTask);
    logger.info('Example task registered with scheduler');
    
    // Register override cleanup task
    scheduler.registerTask(overrideCleanupTask);
    logger.info('Override cleanup task registered with scheduler');
    
    await scheduler.start();
    logger.info('Task scheduler started successfully');
  } catch (error) {
    logger.error('Failed to start task scheduler', { error });
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Stop scheduler first
  try {
    logger.info('Stopping task scheduler...');
    await scheduler.stop();
    logger.info('Task scheduler stopped successfully');
  } catch (error) {
    logger.error('Error stopping task scheduler', { error });
  }
  
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;
