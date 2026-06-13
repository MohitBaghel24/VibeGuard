import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export class SSRFDetector implements Detector {
  readonly id = 'ssrf';
  readonly name = 'Server-Side Request Forgery (SSRF) Detector';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.php'];

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];
    
    const patterns = [
      {
        id: 'js-ssrf',
        regex: /(?:axios\.(?:get|post|put|delete)|fetch|http\.get|https\.get|request)\s*\(\s*[^'"`[{]/g,
        severity: Severity.CRITICAL,
        desc: 'Potential SSRF. Network request URL is dynamic. Ensure user input is validated against an allowlist.'
      },
      {
        id: 'py-ssrf',
        regex: /(?:requests\.(?:get|post|put|delete)|urllib\.request\.urlopen)\s*\(\s*[^'"`]/g,
        severity: Severity.CRITICAL,
        desc: 'Potential SSRF. Network request URL is dynamic. Validate URL input before making requests.'
      },
      {
        id: 'php-ssrf',
        regex: /(?:file_get_contents\s*\(\s*\$|curl_setopt\s*\(\s*\$[\w_]+\s*,\s*CURLOPT_URL\s*,\s*\$)/g,
        severity: Severity.CRITICAL,
        desc: 'Potential SSRF via PHP file_get_contents or curl. Validate dynamic URLs against an allowlist.'
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
          id: `${this.id}:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
          detectorId: this.id,
          ruleId: `${this.id}:${pattern.id}`,
          title: `SSRF Risk: ${pattern.id}`,
          description: pattern.desc,
          severity: pattern.severity,
          filePath,
          line: lineNumber,
          column: match.index - lineStart + 1,
          length: matchText.length,
          match: matchText,
          lineContent: lineContent,
          confidence: 0.8,
          cwe: 'CWE-918'
        });
      }
    }
    return issues;
  }
}
