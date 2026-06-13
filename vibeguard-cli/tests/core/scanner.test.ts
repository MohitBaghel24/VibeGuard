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
});
