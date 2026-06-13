import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export class SQLInjectionDetector implements Detector {
  readonly id = 'sql';
  readonly name = 'SQL Injection Detector';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.java', '.cs', '.go'];

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
      },
      {
        id: 'php-sql-concat',
        regex: /\$db->(?:query|exec)\s*\(\s*["'].*?["']\s*\.\s*\$_(?:GET|POST|REQUEST)/g,
        severity: Severity.CRITICAL,
        desc: 'SQL injection via PHP string concatenation with $_GET/POST.'
      },
      {
        id: 'java-sql-concat',
        regex: /\.executeQuery\s*\(\s*["'][^"']*["']\s*\+\s*[a-zA-Z0-9_]+/g,
        severity: Severity.CRITICAL,
        desc: 'SQL injection via Java string concatenation.'
      },
      {
        id: 'go-sql-sprintf',
        regex: /db\.(?:Query|QueryRow|Exec)\s*\(\s*fmt\.Sprintf/g,
        severity: Severity.CRITICAL,
        desc: 'SQL injection via Go fmt.Sprintf(). Use parameterized queries.'
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
        
        // Find line column and content
        const lineStart = content.lastIndexOf('\n', match.index - 1) + 1;
        let lineEnd = content.indexOf('\n', match.index);
        if (lineEnd === -1) lineEnd = content.length;
        const lineContent = content.substring(lineStart, lineEnd);
        
        issues.push({
          id: `sql:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
          detectorId: this.id,
          ruleId: `${this.id}:${pattern.id}`,
          title: `SQL Injection Detected: ${pattern.id}`,
          description: `${pattern.desc} Use parameterized queries instead.`,
          severity: pattern.severity,
          filePath,
          line: lineNumber,
          column: match.index - lineStart + 1,
          length: matchText.length,
          match: matchText,
          lineContent: lineContent,
          confidence: 0.8,
          cwe: 'CWE-89'
        });
      }
    }
    return issues;
  }
}
