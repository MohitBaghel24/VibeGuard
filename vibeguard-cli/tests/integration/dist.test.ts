import { describe, it, expect } from 'vitest';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

describe('Integration: dist/cli.js (E2E)', () => {
  const cliPath = path.resolve(__dirname, '../../dist/cli.js');
  const fixturesPath = path.resolve(__dirname, '../fixtures/integration');

  it('runs npx vibeguard-scan (dist/cli.js) properly', async () => {
    try {
      await execPromise(`node ${cliPath} scan ${fixturesPath} --fail-below 100`);
      // Should throw because issues are found (exit code 5)
      expect.unreachable('CLI should have exited with non-zero code due to vulnerabilities');
    } catch (error: any) {
      expect(error.code).toBe(5); // 5 is our specific error code for finding issues
      expect(error.stdout).toContain('VibeGuard Security Report');
      expect(error.stdout).toContain('AWS Access Key ID');
      expect(error.stdout).toContain('FAILED');
    }
  });

  it('runs badge command properly', async () => {
    const { stdout } = await execPromise(`node ${cliPath} badge --score 100`);
    expect(stdout).toContain('brightgreen');
    expect(stdout).toContain('VibeGuard-100');
  });

  it('runs init command without crashing', async () => {
    // We run it in a temp-ish context where it either succeeds or prints "already exists"
    // Since it's run in the project root by default, it will likely hit "already exists" and exit 1
    // which is perfectly fine, we just want to ensure the command itself is executable
    try {
      await execPromise(`node ${cliPath} init`);
    } catch (error: any) {
      expect(error.stderr).toContain('already exists');
      expect(error.code).toBe(1);
    }
  });
});
