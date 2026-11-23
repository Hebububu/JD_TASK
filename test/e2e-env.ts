import path from 'node:path';

/**
 * Single source of the e2e environment. Used both as a Jest `setupFiles`
 * entry (before AppModule is imported) and by globalSetup for the migration,
 * so the migrated database and the one the app opens are always the same.
 * The path is absolute so every tool resolves the same file.
 */
export const TEST_DB_PATH = path.resolve(__dirname, 'test.db');

export const E2E_ENV = {
  DATABASE_URL: `file:${TEST_DB_PATH.replace(/\\/g, '/')}`,
  JWT_SECRET: 'e2e-test-secret',
  JWT_EXPIRES_IN: '15m',
};

Object.assign(process.env, E2E_ENV);
