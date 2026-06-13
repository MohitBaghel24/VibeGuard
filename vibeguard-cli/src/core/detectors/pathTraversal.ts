import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export class PathTraversalDetector implements Detector {
  readonly id = 'path-traversal';
  readonly name = 'Path Traversal Detector';
  readonly supportedExtensions = ['.js', '.ts', '.py', '.php', '.java', '.cs', '.go', '.rs'];

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];

    const patterns = [
      {
        id: 'js-path-traversal',
        regex: /(?:fs\.readFile|fs\.readFileSync|path\.join|path\.resolve)\s*\(\s*[^,)]*(?:req\.|request\.)(?:query|body|params)\.[a-zA-Z0-9_]+/g,
        severity: Severity.CRITICAL,
        desc: 'Unsanitized user input passed directly to filesystem operations. This can lead to Path Traversal/LFI.'
      },
      {
        id: 'py-path-traversal',
        regex: /open\s*\(\s*[^,)]*(?:request\.(?:GET|POST|FILES)|os\.path\.join\([^)]*request\.)/g,
        severity: Severity.CRITICAL,
        desc: 'Unsanitized user input passed to open() or path.join. This can lead to Path Traversal/LFI.'
      },
      {
        id: 'php-path-traversal',
        regex: /(?:include|require|file_get_contents|fopen)\s*\(\s*[^)]*\$_(?:GET|POST|REQUEST)/g,
        severity: Severity.CRITICAL,
        desc: 'Unsanitized user input passed to file operations. This can lead to Path Traversal/LFI.'
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
          id: `path-traversal:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
          detectorId: this.id,
          ruleId: `${this.id}:${pattern.id}`,
          title: `Path Traversal Risk: ${pattern.id}`,
          description: pattern.desc,
          severity: pattern.severity,
          filePath,
          line: lineNumber,
          column: match.index - lineStart + 1,
          length: matchText.length,
          match: matchText,
          lineContent: lineContent,
          confidence: 0.9,
          cwe: 'CWE-22'
        });
      }
    }
    return issues;
  }
}
