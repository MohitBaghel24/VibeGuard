import { describe, it, expect, beforeEach } from 'vitest';
import { SQLInjectionDetector } from '../../../src/core/detectors/sql.js';
import { promises as fs } from 'fs';
import path from 'path';

describe('SQLInjectionDetector', () => {
  let detector: SQLInjectionDetector;

  beforeEach(() => {
    detector = new SQLInjectionDetector();
  });

  const runDetector = async (filename: string) => {
    const filePath = path.join(__dirname, '../../fixtures/sql', filename);
    const content = await fs.readFile(filePath, 'utf-8');
    return detector.detect(filename, content);
  };

  it('detects string concat', async () => {
    const issues = await runDetector('string-concat.js');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toContain('js-sql-string-concat');
  });

  it('detects template literal', async () => {
    const issues = await runDetector('template-literal.ts');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toContain('js-sql-template-literal');
  });

  it('detects fstring', async () => {
    const issues = await runDetector('fstring.py');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].title).toContain('py-sql-fstring');
  });

  it('ignores safe parameterized queries', async () => {
    const issues = await runDetector('parameterized-safe.js');
    expect(issues.length).toBe(0);
  });
});
