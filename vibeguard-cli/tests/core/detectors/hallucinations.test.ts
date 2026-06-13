import { describe, it, expect, beforeEach } from 'vitest';
import { AIHallucinationDetector } from '../../../src/core/detectors/hallucinations.js';

describe('AIHallucinationDetector', () => {
  let detector: AIHallucinationDetector;

  beforeEach(async () => {
    detector = new AIHallucinationDetector();
    // Simulate initialization with package.json that has vitest
    await detector.initialize(process.cwd());
  });

  it('detects unknown package via import', () => {
    const content = `import { fakeThing } from 'super-fake-ai-hallucinated-package';`;
    const issues = detector.detect('test.ts', content);
    expect(issues.length).toBe(1);
    expect(issues[0].title).toContain('AI Hallucination');
    expect(issues[0].title).toContain('super-fake-ai-hallucinated-package');
  });

  it('detects unknown package via require', () => {
    const content = `const x = require("does-not-exist-12345");`;
    const issues = detector.detect('test.js', content);
    expect(issues.length).toBe(1);
    expect(issues[0].title).toContain('does-not-exist-12345');
  });

  it('ignores built-in modules', () => {
    const content = `import fs from 'fs'; import path from 'path'; import { spawn } from 'node:child_process';`;
    const issues = detector.detect('test.ts', content);
    expect(issues.length).toBe(0);
  });

  it('ignores actual installed dependencies', () => {
    const content = `import { describe } from 'vitest'; import 'typescript';`;
    const issues = detector.detect('test.ts', content);
    expect(issues.length).toBe(0); // vitest and typescript are in our package.json
  });

  it('handles scoped packages properly', () => {
    const content = `import stuff from '@fake/scope';`;
    const issues = detector.detect('test.ts', content);
    expect(issues.length).toBe(1);
    expect(issues[0].title).toContain('@fake/scope');
  });
});
