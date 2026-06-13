import { describe, it, expect, beforeEach } from 'vitest';
import { SecretDetector } from '../../../src/core/detectors/secrets.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('SecretDetector', () => {
  let detector: SecretDetector;

  beforeEach(() => {
    detector = new SecretDetector();
  });

  const runDetector = async (filename: string) => {
    const filePath = path.join(__dirname, '../../fixtures/secrets', filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return detector.detect(filename, content);
  };

  it('detects AWS access keys', async () => {
    const issues = await runDetector('aws-keys.js');
    const awsIssue = issues.find(i => i.title.includes('AWS Access Key ID'));
    expect(awsIssue).toBeDefined();
    expect(awsIssue?.severity).toBe('critical');
    expect(awsIssue?.match).toContain('***');
  });

  it('detects GitHub tokens', async () => {
    const issues = await runDetector('github-tokens.ts');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toBe('GitHub Token detected');
  });

  it('ignores false positives and placeholders', async () => {
    const issues = await runDetector('false-positives.js');
    expect(issues.length).toBe(0);
  });

  it('ignores test files', async () => {
    const issues = await runDetector('test-file.spec.js');
    expect(issues.length).toBe(0);
  });

  it('ignores object property access contexts (false positive filtering)', () => {
    const content = `
      const token = req.headers.authorization;
      const key = process.env.SECRET_KEY;
      const secret = config.db.password;
    `;
    const issues = detector.detect('app.js', content);
    expect(issues.length).toBe(0);
  });
});
