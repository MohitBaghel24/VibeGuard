import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { discoverFiles, readFileContent, isBinary, sanitizeFilePath, SecurityError } from '../../src/utils/files.js';
import { VibeGuardConfig, Severity } from '../../src/types/index.js';

const mockConfig: VibeGuardConfig = {
  minSeverity: Severity.LOW,
  scoreThreshold: 50,
  ignore: ['**/node_modules/**'],
  extensions: ['.js', '.ts'],
  maxFileSize: 1048576,
  detectors: {},
  outputFormat: 'text',
  showBadge: true,
};

describe('files utils', () => {
  it('isBinary should detect null bytes', () => {
    const textBuffer = Buffer.from('hello world', 'utf-8');
    const binaryBuffer = Buffer.from([0x68, 0x65, 0x00, 0x6c, 0x6f]);
    expect(isBinary(textBuffer)).toBe(false);
    expect(isBinary(binaryBuffer)).toBe(true);
  });

  it('sanitizeFilePath should prevent path traversal', () => {
    const root = path.resolve('/var/www/app');
    expect(sanitizeFilePath('src/index.js', root)).toBe(path.join(root, 'src/index.js'));
    expect(() => sanitizeFilePath('../../../etc/passwd', root)).toThrowError(SecurityError);
  });
  
  describe('fs tests', () => {
    const tempDir = path.join(__dirname, 'temp_test_dir');
    
    beforeAll(async () => {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(path.join(tempDir, 'test.js'), 'console.log("hello");');
      await fs.writeFile(path.join(tempDir, 'test.ts'), 'const a: number = 1;');
      await fs.writeFile(path.join(tempDir, 'ignore.js'), 'ignored');
      await fs.writeFile(path.join(tempDir, 'large.js'), 'a');
      await fs.writeFile(path.join(tempDir, 'binary.js'), Buffer.from([0x00, 0x01, 0x02]));
      
      await fs.writeFile(path.join(tempDir, '.gitignore'), 'ignore.js\n');
    });

    afterAll(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it('readFileContent should read valid file', async () => {
      const content = await readFileContent(path.join(tempDir, 'test.js'));
      expect(content).toBe('console.log("hello");');
    });

    it('readFileContent should skip binary file', async () => {
      const content = await readFileContent(path.join(tempDir, 'binary.js'));
      expect(content).toBeNull();
    });

    it('discoverFiles should find correct files', async () => {
      const config = { ...mockConfig, maxFileSize: 10 }; // 'large.js' should be larger if we made it larger, but it's 1 byte. Let's adjust
      
      const files = await discoverFiles(tempDir, mockConfig);
      
      expect(files).toContain('test.js');
      expect(files).toContain('test.ts');
      expect(files).not.toContain('ignore.js'); // ignored by .gitignore
    });

    it('discoverFiles should respect maxFileSize', async () => {
       const config = { ...mockConfig, maxFileSize: 5 };
       await fs.writeFile(path.join(tempDir, 'huge.js'), 'x'.repeat(10));
       const files = await discoverFiles(tempDir, config);
       expect(files).not.toContain('huge.js');
    });
  });
});
