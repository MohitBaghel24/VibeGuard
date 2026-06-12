import { describe, it, expect, beforeEach } from 'vitest';
import { AuthChecker } from '../../../src/core/detectors/auth.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('AuthChecker', () => {
  let detector: AuthChecker;

  beforeEach(() => {
    detector = new AuthChecker();
  });

  const runDetector = async (filename: string) => {
    const filePath = path.join(__dirname, '../../fixtures/auth', filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return detector.detect(filename, content);
  };

  it('detects missing auth in express', async () => {
    const issues = await runDetector('express-no-auth.js');
    expect(issues.length).toBeGreaterThan(0);
  });

  it('ignores routes with auth in express', async () => {
    const issues = await runDetector('express-with-auth.js');
    expect(issues.length).toBe(0);
  });

  it('detects missing auth in flask', async () => {
    const issues = await runDetector('flask-routes.py');
    expect(issues.length).toBeGreaterThan(0);
  });
});
