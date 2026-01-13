import { getTestDb } from './helpers';

describe('Test Infrastructure', () => {
  it('should connect to test database', async () => {
    const db = getTestDb();
    expect(db).toBeDefined();
    
    // Simple query to verify connection
    const result = await db.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
  });

  it('should have JWT_SECRET configured', () => {
    expect(process.env.JWT_SECRET).toBe('test-secret-key');
  });

  it('should be in test environment', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });
});
