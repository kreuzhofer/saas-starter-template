import { Router } from 'express';
import { getAppConfig } from '../controllers/config';

const router = Router();

// GET /api/config/app - Get application configuration
router.get('/app', getAppConfig);

export default router;
