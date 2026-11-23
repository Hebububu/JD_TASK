import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import path from 'node:path';
import { E2E_ENV, TEST_DB_PATH } from './e2e-env';

/**
 * Runs once, in the parent process, before `setupFiles`. It cannot rely on
 * them, so it passes the test env to the migration explicitly.
 */
export default function globalSetup() {
  rmSync(TEST_DB_PATH, { force: true });
  rmSync(`${TEST_DB_PATH}-journal`, { force: true });
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, ...E2E_ENV },
    stdio: 'pipe',
  });
}
