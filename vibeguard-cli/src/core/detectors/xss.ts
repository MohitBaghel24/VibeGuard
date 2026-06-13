import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export class XSSDetector implements Detector {
  readonly id = 'xss';
  readonly name = 'Cross-Site Scripting (XSS) Detector';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.php', '.java', '.cs', '.go'];

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split('\n');

    const patterns = [
      {
        id: 'js-xss-innerhtml',
        regex: /\.innerHTML\s*=\s*[^"'\s]/g,
        severity: Severity.HIGH,
        desc: 'Potential DOM-based XSS via innerHTML assignment. Use textContent instead.'
      },
      {
        id: 'react-xss-dangerouslyset',
        regex: /dangerouslySetInnerHTML\s*=\s*\{/g,
        severity: Severity.HIGH,
        desc: 'React dangerouslySetInnerHTML can lead to XSS if input is unsanitized.'
      },
      {
        id: 'js-xss-documentwrite',
        regex: /document\.write\s*\(/g,
        severity: Severity.MEDIUM,
        desc: 'document.write can lead to XSS and is bad practice.'
      },
      {
        id: 'php-xss-echo',
        regex: /echo\s+\$_[A-Z]+\[/g,
        severity: Severity.CRITICAL,
        desc: 'Directly echoing user input (e.g. $_GET) leads to Reflected XSS. Use htmlspecialchars().'
      }
    ];

    const getLineNumber = (index: number) => {
      let count = 1;
      for (let i = 0; i < index; i++) {
        if (content[i] === '\n') count++;
      }
      return count;
    };

    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      let match;
      
      while ((match = pattern.regex.exec(content)) !== null) {
        const matchText = match[0];
        const lineNumber = getLineNumber(match.index);
        
        const lineStart = content.lastIndexOf('\n', match.index - 1) + 1;
        let lineEnd = content.indexOf('\n', match.index);
        if (lineEnd === -1) lineEnd = content.length;
        const lineContent = content.substring(lineStart, lineEnd);
        
        issues.push({
          id: `xss:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
          detectorId: this.id,
          ruleId: `${this.id}:${pattern.id}`,
          title: `XSS Risk: ${pattern.id}`,
          description: pattern.desc,
          severity: pattern.severity,
          filePath,
          line: lineNumber,
          column: match.index - lineStart + 1,
          length: matchText.length,
          match: matchText,
          lineContent: lineContent,
          confidence: 0.8,
          cwe: 'CWE-79'
        });
      }
    }
    return issues;
  }
}
