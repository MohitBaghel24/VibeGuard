import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export class CommandInjectionDetector implements Detector {
  readonly id = 'cmdInjection';
  readonly name = 'Command Injection Detector';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.php', '.go'];

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];
    
    const patterns = [
      {
        id: 'js-cmd-injection',
        regex: /\b(?:child_process\.)?(?:exec|spawn|execSync|spawnSync)\s*\(\s*[^'"`[{(]/g,
        severity: Severity.CRITICAL,
        desc: 'Potential Command Injection via Node.js exec/spawn. Ensure input is strictly sanitized or avoid shell execution.'
      },
      {
        id: 'py-cmd-injection',
        regex: /\b(?:os\.system|subprocess\.(?:Popen|run|call|check_output))\s*\(\s*[^'"`[{(]/g,
        severity: Severity.CRITICAL,
        desc: 'Potential Command Injection via Python os/subprocess. Avoid passing dynamic unsanitized variables to the shell.'
      },
      {
        id: 'php-cmd-injection',
        regex: /\b(?:shell_exec|exec|system|passthru)\s*\(\s*\$[^)]+\)/g,
        severity: Severity.CRITICAL,
        desc: 'Potential Command Injection via PHP shell execution. Use escapeshellarg() or avoid shell execution.'
      },
      {
        id: 'go-cmd-injection',
        regex: /\bexec\.Command\s*\(\s*[^'"`]/g,
        severity: Severity.CRITICAL,
        desc: 'Potential Command Injection via Go exec.Command. Ensure input is strictly sanitized.'
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
          title: `Command Injection Risk: ${pattern.id}`,
          description: pattern.desc,
          severity: pattern.severity,
          filePath,
          line: lineNumber,
          column: match.index - lineStart + 1,
          length: matchText.length,
          match: matchText,
          lineContent: lineContent,
          confidence: 0.8,
          cwe: 'CWE-78'
        });
      }
    }
    return issues;
  }
}
