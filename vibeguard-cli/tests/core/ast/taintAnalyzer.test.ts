import { describe, it, expect } from 'vitest';
import { analyzeFileForTaint } from '../../../src/core/ast/taintAnalyzer.js';

describe('AST Taint Analyzer', () => {
  it('detects simple taint flow to SQL sink', () => {
    const code = `
      function getUser(req, res) {
        const userId = req.query.id;
        db.query("SELECT * FROM users WHERE id=" + userId);
      }
    `;
    const issues = analyzeFileForTaint('test.js', code);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('ast:sql-taint');
  });

  it('detects taint flow to SSRF sink via multiple assignments', () => {
    const code = `
      function proxy(req, res) {
        const payload = req.body;
        const targetUrl = payload.url;
        fetch(targetUrl);
      }
    `;
    const issues = analyzeFileForTaint('test.js', code);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('ast:ssrf-taint');
  });

  it('detects taint flow to Command Injection sink', () => {
    const code = `
      function runCmd(req, res) {
        let cmd = "ls -la";
        cmd = req.query.cmd;
        const cp = require('child_process');
        cp.exec(cmd);
      }
    `;
    const issues = analyzeFileForTaint('test.js', code);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('ast:cmd-taint');
  });

  it('ignores sinks without tainted variables', () => {
    const code = `
      function getUser(req, res) {
        const safeId = "12345";
        db.query("SELECT * FROM users WHERE id=" + safeId);
      }
    `;
    const issues = analyzeFileForTaint('test.js', code);
    expect(issues.length).toBe(0);
  });
  
  it('clears taint when variable is reassigned to safe value', () => {
    const code = `
      function proxy(req, res) {
        let targetUrl = req.body.url;
        targetUrl = "https://safe.api.com";
        fetch(targetUrl);
      }
    `;
    const issues = analyzeFileForTaint('test.js', code);
    expect(issues.length).toBe(0);
  });
});
