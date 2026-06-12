import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export class AuthChecker implements Detector {
  readonly id = 'auth';
  readonly name = 'Authentication Checker';
  readonly supportedExtensions = ['.js', '.ts', '.py'];

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split('\n');

    const sensitiveRoutes = ['/admin', '/api/admin', '/api/users', '/api/delete', '/dashboard', '/api/private'];
    const authKeywords = ['authenticate', 'requireAuth', 'isAuthenticated', 'passport.authenticate', 'jwt', 'auth', 'protect', 'verifyToken'];

    const isSensitive = (pathStr: string) => sensitiveRoutes.some(route => pathStr.includes(route));
    const hasAuth = (lineStr: string) => authKeywords.some(kw => lineStr.toLowerCase().includes(kw.toLowerCase()));

    const expressRegex = /(?:app|router)\.(?:get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    const pyRegex = /@app\.(?:route|get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineNumber = lineIdx + 1;

      if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
        let match;
        expressRegex.lastIndex = 0;
        while ((match = expressRegex.exec(line)) !== null) {
          const routePath = match[1];
          if (isSensitive(routePath)) {
            if (!hasAuth(line)) {
               issues.push({
                id: `auth:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
                detectorId: this.id,
                title: 'Missing Authentication Middleware',
                description: `Sensitive route ${routePath} may be missing authentication middleware.`,
                severity: routePath.includes('/admin') ? Severity.CRITICAL : Severity.HIGH,
                filePath,
                line: lineNumber,
                column: match.index + 1,
                length: match[0].length,
                match: match[0],
                lineContent: line,
                confidence: 0.7,
                cwe: 'CWE-285'
              });
            }
          }
        }
      }

      if (filePath.endsWith('.py')) {
        let match;
        pyRegex.lastIndex = 0;
        while ((match = pyRegex.exec(line)) !== null) {
          const routePath = match[1];
          if (isSensitive(routePath)) {
             let authFound = false;
             for (let i = Math.max(0, lineIdx - 2); i <= Math.min(lines.length - 1, lineIdx + 3); i++) {
               if (hasAuth(lines[i])) {
                 authFound = true;
                 break;
               }
             }

             if (!authFound) {
               issues.push({
                id: `auth:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
                detectorId: this.id,
                title: 'Missing Authentication Middleware',
                description: `Sensitive route ${routePath} may be missing authentication middleware.`,
                severity: routePath.includes('/admin') ? Severity.CRITICAL : Severity.HIGH,
                filePath,
                line: lineNumber,
                column: match.index + 1,
                length: match[0].length,
                match: match[0],
                lineContent: line,
                confidence: 0.7,
                cwe: 'CWE-285'
              });
             }
          }
        }
      }
    }
    return issues;
  }
}
