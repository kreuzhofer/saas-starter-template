import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// In test mode, we'll use a singleton that can be shared with test helpers
let prismaInstance: PrismaClient;

function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const logConfig = process.env.NODE_ENV === 'development'
      ? [
          { level: 'query' as const, emit: 'event' as const },
          { level: 'error' as const, emit: 'stdout' as const },
          { level: 'warn' as const, emit: 'stdout' as const },
        ]
      : [
          { level: 'error' as const, emit: 'stdout' as const },
          { level: 'warn' as const, emit: 'stdout' as const },
        ];

    prismaInstance = new PrismaClient({
      log: logConfig,
    }) as any;

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      (prismaInstance as any).$on('query', (e: any) => {
        logger.debug('Query', { query: e.query, duration: `${e.duration}ms` });
      });
    }
  }
  return prismaInstance;
}

const prisma = getPrismaClient();

export default prisma;
