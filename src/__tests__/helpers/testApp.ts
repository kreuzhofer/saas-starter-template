import express from 'express';
import cors from 'cors';
import { errorHandler } from '../../middleware/errorHandler';
import { languageDetection } from '../../middleware/languageDetection';
import authRoutes from '../../routes/auth';
import profileRoutes from '../../routes/profile';
import adminRoutes from '../../routes/admin';
import accountRoutes from '../../routes/account';
import bannerRoutes from '../../routes/banner';

/**
 * Create a test Express app instance
 * This is a simplified version of the main server without starting the HTTP server
 */
export function createTestApp() {
  const app = express();

  // Trust proxy to get correct IP from X-Forwarded-For header
  app.set('trust proxy', true);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Language detection middleware (must be before routes)
  app.use(languageDetection);

  // API routes
  app.use('/api/auth', authRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/banners', bannerRoutes);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}
