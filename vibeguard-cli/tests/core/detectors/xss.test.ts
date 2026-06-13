import { describe, it, expect } from 'vitest';
import { XSSDetector } from '../../../src/core/detectors/xss.js';

describe('XSSDetector', () => {
  const detector = new XSSDetector();

  it('detects innerHTML assignment', () => {
    const issues = detector.detect('test.js', `
      document.getElementById('app').innerHTML = req.query.payload;
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('xss:js-xss-innerhtml');
    expect(issues[0].line).toBe(2);
  });

  it('detects react dangerouslySetInnerHTML', () => {
    const issues = detector.detect('test.jsx', `
      return <div dangerouslySetInnerHTML={{ __html: dynamicData }} />;
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('xss:react-xss-dangerouslyset');
    expect(issues[0].line).toBe(2);
  });

  it('detects document.write', () => {
    const issues = detector.detect('test.js', `
      document.write(userInput);
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('xss:js-xss-documentwrite');
  });

  it('detects PHP echo with $_GET', () => {
    const issues = detector.detect('test.php', `
      <?php
      echo $_GET['message'];
      ?>
    `);
    expect(issues.length).toBe(1);
    expect(issues[0].ruleId).toBe('xss:php-xss-echo');
  });

  it('ignores safe innerHTML assignment', () => {
    const issues = detector.detect('test.js', `
      document.getElementById('app').innerHTML = "Safe Content";
    `);
    // innerHTML with strings is generally safe-ish if hardcoded, but regex checks for [^"']
    expect(issues.length).toBe(0);
  });
});
