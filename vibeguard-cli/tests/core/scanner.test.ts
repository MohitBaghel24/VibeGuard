import { describe, it, expect } from 'vitest';
import { scanFile, AllDetectors } from '../../src/core/scanner.js';
import { calculateScore, deduplicateIssues } from '../../src/core/scoring.js';
import { Severity } from '../../src/types/index.js';

describe('Scoring', () => {
  it('deduplicates issues', () => {
    const issues: any = [
      { filePath: 'a.js', line: 1, detectorId: 'x' },
      { filePath: 'a.js', line: 1, detectorId: 'x' },
      { filePath: 'b.js', line: 1, detectorId: 'x' },
    ];
    expect(deduplicateIssues(issues).length).toBe(2);
  });

  it('calculates score correctly', () => {
    const issues: any = [
      { severity: Severity.CRITICAL },
      { severity: Severity.HIGH }
    ];
    const res = calculateScore(issues);
    expect(res.overallScore).toBe(53); // 100 * Math.exp(-19 / 30)
    expect(res.rating).toBe('needs-work');
  });
});

describe('Scanner', () => {
  it('scanFile finds issues', () => {
    const content = 'const awsAccessKey = "AKIAIOSFODNN7ABCDEFG";';
    const issues = scanFile('test.js', content, AllDetectors);
    expect(issues.length).toBeGreaterThan(0);
  });

  describe('Inline Ignores', () => {
    it('ignores all issues on the next line', () => {
      const content = `
// vibeguard-disable-next-line
const awsAccessKey = "AKIAIOSFODNN7ABCDEFG";
      `;
      const issues = scanFile('test.js', content, AllDetectors);
      expect(issues.length).toBe(0);
    });

    it('ignores specific rules on the next line', () => {
      const content = `
// vibeguard-disable-next-line secrets:aws-access-key
const awsAccessKey = "AKIAIOSFODNN7ABCDEFG"; db.execute(userInput);
      `;
      const issues = scanFile('test.js', content, AllDetectors);
      // The secret is ignored, but the SQL injection should still be caught!
      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.detectorId === 'secrets')).toBe(false);
      expect(issues.some(i => i.detectorId === 'sql')).toBe(true);
    });

    it('does not ignore if rule string does not match', () => {
      const content = `
// vibeguard-disable-next-line sql:js-unparameterized-execute
const awsAccessKey = "AKIAIOSFODNN7ABCDEFG";
      `;
      const issues = scanFile('test.js', content, AllDetectors);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].detectorId).toBe('secrets');
    });
  });
});
