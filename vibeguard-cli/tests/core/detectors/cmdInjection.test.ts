import { describe, it, expect } from 'vitest';
import { CommandInjectionDetector } from '../../../src/core/detectors/cmdInjection.js';

describe('CommandInjectionDetector', () => {
  const detector = new CommandInjectionDetector();

  it('detects js exec() with dynamic variable', () => {
    const issues = detector.detect('test.js', `
      const child_process = require('child_process');
      child_process.exec(req.body.cmd, (err) => {});
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('cmdInjection:js-cmd-injection');
  });

  it('ignores js exec() with hardcoded string', () => {
    const issues = detector.detect('test.js', `
      const child_process = require('child_process');
      child_process.exec('ls -la', (err) => {});
    `);
    expect(issues.length).toBe(0);
  });

  it('detects python os.system() with dynamic variable', () => {
    const issues = detector.detect('test.py', `
      import os
      os.system(user_input)
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('cmdInjection:py-cmd-injection');
  });

  it('detects php shell_exec() with dynamic variable', () => {
    const issues = detector.detect('test.php', `
      <?php
      shell_exec($_GET['cmd']);
      ?>
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('cmdInjection:php-cmd-injection');
  });

  it('detects go exec.Command with dynamic variable', () => {
    const issues = detector.detect('test.go', `
      cmd := exec.Command(req.URL.Query().Get("cmd"))
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('cmdInjection:go-cmd-injection');
  });
});
