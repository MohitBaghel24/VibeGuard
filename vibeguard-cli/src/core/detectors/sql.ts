import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export class SQLInjectionDetector implements Detector {
  readonly id = 'sql';
  readonly name = 'SQL Injection Detector';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py'];

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split('\n');

    const patterns = [
      {
        id: 'js-sql-template-literal',
        regex: /`[^`]*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b[^`]*?\$\{[^}]+\}[^`]*?`/gi,
        severity: Severity.CRITICAL,
        desc: 'SQL injection via template literal.'
      },
      {
        id: 'js-sql-string-concat',
        regex: /(["'])(?:.*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b.*?)\1\s*\+\s*[a-zA-Z0-9_.]+/gi,
        severity: Severity.HIGH,
        desc: 'SQL injection via string concatenation.'
      },
      {
        id: 'py-sql-fstring',
        regex: /f(["'])(?:.*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b.*?\{[^}]+\}.*?)\1/gi,
        severity: Severity.CRITICAL,
        desc: 'SQL injection via Python f-string.'
      },
      {
        id: 'py-sql-format',
        regex: /(["'])(?:.*?(?:SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b.*?\{\}.*?)\1\.format\(/gi,
        severity: Severity.CRITICAL,
        desc: 'SQL injection via Python .format().'
      },
      {
        id: 'js-unparameterized-execute',
        regex: /\.(?:execute|query)\s*\(\s*[a-zA-Z0-9_]+\s*\)/g,
        severity: Severity.HIGH,
        desc: 'Unparameterized database execution.'
      }
    ];

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineNumber = lineIdx + 1;

      for (const pattern of patterns) {
        pattern.regex.lastIndex = 0;
        let match;
        
        while ((match = pattern.regex.exec(line)) !== null) {
          const matchText = match[0];
          
          issues.push({
            id: `sql:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
            detectorId: this.id,
            title: `SQL Injection Detected: ${pattern.id}`,
            description: `${pattern.desc} Use parameterized queries instead.`,
            severity: pattern.severity,
            filePath,
            line: lineNumber,
            column: match.index + 1,
            length: matchText.length,
            match: matchText,
            lineContent: line,
            confidence: 0.8,
            cwe: 'CWE-89'
          });
        }
      }
    }
    return issues;
  }
}
