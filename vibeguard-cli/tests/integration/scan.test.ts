import { describe, it, expect } from 'vitest';
import { scan } from '../../src/core/scanner.js';
import { loadConfig } from '../../src/utils/config.js';
import path from 'path';

describe('Integration: scan()', () => {
  it('scans a full directory and finds expected issues', async () => {
    const rootPath = path.join(__dirname, '../fixtures/integration');
    const config = await loadConfig({ ignore: [] });
    
    const result = await scan({ rootPath, config });
    
    expect(result.filesScanned).toBeGreaterThan(0);
    expect(result.issues.length).toBeGreaterThanOrEqual(3);
    
    const issueTitles = result.issues.map(i => i.title);
    
    expect(issueTitles.some(t => t.includes('AWS Access Key ID'))).toBe(true);
    expect(issueTitles.some(t => t.includes('js-sql-string-concat'))).toBe(true);
    expect(issueTitles.some(t => t.includes('Missing Authentication'))).toBe(true);
    
    const nodeModulesIssues = result.issues.filter(i => i.filePath.includes('node_modules'));
    expect(nodeModulesIssues.length).toBe(0);
  });
});
