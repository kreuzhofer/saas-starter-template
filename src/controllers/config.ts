import { Request, Response } from 'express';
import logger from '../utils/logger';

/**
 * GET /api/config/app
 * Get application configuration
 */
export const getAppConfig = async (req: Request, res: Response) => {
  try {
    logger.info('App configuration retrieved');

    res.json({
      version: '1.0.0',
      name: 'SaaS Starter Template',
    });
  } catch (error) {
    logger.error('Failed to retrieve app configuration', { error });
    res.status(500).json({ error: 'Failed to retrieve app configuration' });
  }
};
