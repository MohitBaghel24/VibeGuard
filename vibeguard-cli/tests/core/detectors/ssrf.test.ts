import { describe, it, expect } from 'vitest';
import { SSRFDetector } from '../../../src/core/detectors/ssrf.js';

describe('SSRFDetector', () => {
  const detector = new SSRFDetector();

  it('detects js fetch() with dynamic variable', () => {
    const issues = detector.detect('test.js', `
      const url = req.query.url;
      fetch(url).then(res => res.json());
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('ssrf:js-ssrf');
  });

  it('ignores js fetch() with hardcoded string', () => {
    const issues = detector.detect('test.js', `
      fetch('https://api.github.com/users').then(res => res.json());
    `);
    expect(issues.length).toBe(0);
  });

  it('detects python requests.get() with dynamic variable', () => {
    const issues = detector.detect('test.py', `
      import requests
      response = requests.get(user_url)
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('ssrf:py-ssrf');
  });

  it('ignores python requests.get() with hardcoded string', () => {
    const issues = detector.detect('test.py', `
      import requests
      response = requests.get("https://google.com")
    `);
    expect(issues.length).toBe(0);
  });

  it('detects php file_get_contents with dynamic variable', () => {
    const issues = detector.detect('test.php', `
      <?php
      $data = file_get_contents($_GET['url']);
      ?>
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('ssrf:php-ssrf');
  });

  it('detects js axios() direct call with dynamic variable', () => {
    const issues = detector.detect('test.js', `
      const targetUrl = req.query.url;
      axios(targetUrl);
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('ssrf:js-ssrf');
  });
});
