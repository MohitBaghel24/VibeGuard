import { describe, it, expect } from 'vitest';
import { SecretDetector } from '../../src/core/detectors/secrets.js';

describe('Fix Command Logic', () => {
  it('identifies secrets that can be fixed', () => {
    const detector = new SecretDetector();
    const content = `const apiKey = 'AKIAIOSFODNN7ABCDEFG';`;
    const issues = detector.detect('test.ts', content);
    
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].replacement).toBe('process.env.SECRET_KEY');
    
    // Simulating the fix command's replacement logic
    const target = issues[0].rawMatch || issues[0].match;
    const fixedContent = content.replace(target, issues[0].replacement!);
    
    expect(fixedContent).toBe(`const apiKey = 'process.env.SECRET_KEY';`);
  });

  it('identifies bearer tokens that can be fixed', () => {
    const detector = new SecretDetector();
    const content = `const auth = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';`;
    const issues = detector.detect('test.ts', content);
    
    expect(issues.length).toBeGreaterThan(0);
    expect(issues[0].replacement).toBe('process.env.SECRET_KEY');
  });
});
