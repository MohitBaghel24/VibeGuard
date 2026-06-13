import { describe, it, expect, vi } from 'vitest';
import { formatTextReport, formatJSONReport, formatBadge, printProgress } from '../../src/utils/output.js';
import { ScanResult, Severity } from '../../src/types/index.js';

describe('Output Formatter', () => {
  const mockResult: ScanResult = {
    version: '1.0.0',
    filesScanned: 10,
    durationMs: 150,
    linesScanned: 1000,
    overallScore: 85,
    rating: 'good',
    passed: true,
    issues: [
      {
        id: 'test-1',
        detectorId: 'secrets',
        title: 'Exposed Key',
        description: 'Key found',
        severity: Severity.HIGH,
        filePath: 'src/index.js',
        line: 10,
        column: 5,
        length: 20,
        match: '***REDACTED***',
        lineContent: 'const key = "***REDACTED***";',
        confidence: 0.9,
        cwe: 'CWE-798'
      }
    ],
    issuesBySeverity: {
      [Severity.CRITICAL]: [],
      [Severity.HIGH]: [{ /* mock issue */ } as any],
      [Severity.MEDIUM]: [],
      [Severity.LOW]: []
    },
    issuesByDetector: {
      secrets: []
    },
    categoryScores: {
      'Secret & Credential Detector': { name: 'Secret & Credential Detector', score: 85, issueCount: 1, maxSeverity: Severity.HIGH }
    }
  };

  it('formats text report correctly', () => {
    const report = formatTextReport(mockResult);
    expect(report).toContain('VibeGuard Security Report v1.0.0');
    expect(report).toContain('Files scanned:     10');
    expect(report).toContain('Vibe Code Safety Score:  85/100');
    expect(report).toContain('Exposed Key');
    expect(report).toContain('src/index.js:10');
    expect(report).toContain('PASSED');
  });

  it('formats json report correctly', () => {
    const jsonStr = formatJSONReport(mockResult);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.overallScore).toBe(85);
    expect(parsed.filesScanned).toBe(10);
    expect(parsed.issues[0].title).toBe('Exposed Key');
  });

  it('formats badges correctly based on rating', () => {
    expect(formatBadge(100, 'excellent')).toContain('brightgreen');
    expect(formatBadge(85, 'good')).toContain('green');
    expect(formatBadge(50, 'needs-work')).toContain('yellow');
    expect(formatBadge(20, 'poor')).toContain('orange');
    expect(formatBadge(0, 'critical')).toContain('red');
  });

  it('printProgress does not throw', () => {
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    
    // Just ensure it runs without blowing up stdout
    expect(() => printProgress(5, 10, 'test.js')).not.toThrow();
    
    stdoutSpy.mockRestore();
  });
});
