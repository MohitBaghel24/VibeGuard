import { describe, it, expect } from 'vitest';
import { PathTraversalDetector } from '../../../src/core/detectors/pathTraversal.js';

describe('PathTraversalDetector', () => {
  const detector = new PathTraversalDetector();

  it('detects js fs.readFile with dynamic variable', () => {
    const issues = detector.detect('test.js', `
      const fs = require('fs');
      fs.readFile(req.query.file, (err, data) => {});
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('pathTraversal:js-path-traversal');
    expect(issues[0].line).toBe(3);
  });

  it('ignores js fs.readFile with hardcoded string', () => {
    const issues = detector.detect('test.js', `
      const fs = require('fs');
      fs.readFile('/etc/passwd', (err, data) => {});
    `);
    expect(issues.length).toBe(0);
  });

  it('detects python open() with dynamic variable', () => {
    const issues = detector.detect('test.py', `
      f = open(request.GET['file'], 'r')
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('pathTraversal:py-path-traversal');
  });

  it('detects php fopen with dynamic variable', () => {
    const issues = detector.detect('test.php', `
      <?php
      $handle = fopen($_GET['file'], "r");
      ?>
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('pathTraversal:php-path-traversal');
  });
});
