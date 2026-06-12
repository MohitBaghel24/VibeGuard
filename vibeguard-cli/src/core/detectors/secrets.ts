import { Issue, Severity, SecretPattern } from '../../types/index.js';
import crypto from 'crypto';
import path from 'path';

export interface Detector {
  readonly id: string;
  readonly name: string;
  readonly supportedExtensions: string[];
  detect(filePath: string, content: string): Issue[];
}

function calculateEntropy(str: string): number {
  const len = str.length;
  if (len === 0) return 0;
  const freq: Record<string, number> = {};
  for (const char of str) freq[char] = (freq[char] || 0) + 1;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

const COMMON_FALSE_POSITIVES = [
  /your-/i, /YOUR_/, /placeholder/i, /example/i, /test/i,
  /dummy/i, /fake/i, /changeme/i, /insert-here/i,
  /throw new Error/, /console\./
];

function isFalsePositive(match: string, line: string, filePath: string): boolean {
  const trimmedLine = line.trim();
  if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#') || trimmedLine.startsWith('*') || trimmedLine.startsWith('<!--')) {
    return true;
  }
  
  if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__')) {
    return true;
  }

  for (const fp of COMMON_FALSE_POSITIVES) {
    if (fp.test(match) || fp.test(line)) {
      return true;
    }
  }

  return false;
}

export const PATTERNS: SecretPattern[] = [
  { id: 'aws-access-key', name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/g, severity: Severity.CRITICAL, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'aws-secret-key', name: 'AWS Secret Access Key', regex: /aws_secret_access_key.*['"][0-9a-zA-Z/+]{40}['"]/gi, severity: Severity.CRITICAL, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'github-token', name: 'GitHub Token', regex: /ghp_[0-9a-zA-Z]{36}/g, severity: Severity.CRITICAL, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'github-pat', name: 'GitHub PAT', regex: /github_pat_[0-9a-zA-Z_]{22,}/g, severity: Severity.CRITICAL, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'stripe-live-key', name: 'Stripe Live Key', regex: /sk_live_[0-9a-zA-Z]{24}/g, severity: Severity.CRITICAL, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'generic-api-key', name: 'Generic API Key', regex: /(?:api[_-]?key|apikey|api_secret)\s*[:=]\s*["']([^"']{20,})["']/gi, severity: Severity.HIGH, entropyThreshold: 3.0, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'bearer-token', name: 'Bearer Token', regex: /bearer\s+[0-9a-zA-Z\-._~+/]+=*/gi, severity: Severity.HIGH, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'jwt-token', name: 'JWT Token', regex: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_+/]+=*/g, severity: Severity.HIGH, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'private-key', name: 'Private Key', regex: /-----BEGIN (RSA|DSA|EC|OPENSSH|PGP) PRIVATE KEY-----/g, severity: Severity.CRITICAL, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'slack-token', name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z-]+/g, severity: Severity.HIGH, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'discord-token', name: 'Discord Token', regex: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g, severity: Severity.HIGH, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] },
  { id: 'db-password', name: 'Database Password', regex: /(?:password|passwd|pwd)\s*[:=]\s*["']([^"']{8,})["']/gi, severity: Severity.HIGH, falsePositiveFilters: [{ name: 'common', test: isFalsePositive }] }
];

export class SecretDetector implements Detector {
  readonly id = 'secrets';
  readonly name = 'Secret & Credential Detector';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yaml', '.yml', '.env'];

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];
    const lines = content.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];
      const lineNumber = lineIdx + 1;

      for (const pattern of PATTERNS) {
        pattern.regex.lastIndex = 0;
        let match;
        
        while ((match = pattern.regex.exec(line)) !== null) {
          const matchText = match[0];
          const capturedValue = match[1] || matchText;
          
          let skip = false;
          for (const filter of pattern.falsePositiveFilters) {
            if (filter.test(matchText, line, filePath)) {
              skip = true;
              break;
            }
          }
          
          if (skip) continue;

          if (pattern.entropyThreshold !== undefined) {
            const entropy = calculateEntropy(capturedValue);
            if (entropy < pattern.entropyThreshold) {
              continue;
            }
          }

          const redacted = matchText.length > 8 
            ? `${matchText.substring(0, 4)}***${matchText.substring(matchText.length - 4)}`
            : '***';

          const confidence = pattern.entropyThreshold !== undefined 
            ? Math.min(0.95, calculateEntropy(capturedValue) / 5)
            : 0.95;

          issues.push({
            id: `secrets:${hash(`${filePath}:${lineNumber}:${match.index}`)}`,
            detectorId: this.id,
            title: `${pattern.name} detected`,
            description: 'Hardcoded secrets found. Move to environment variable using .env file.',
            severity: pattern.severity,
            filePath,
            line: lineNumber,
            column: match.index + 1,
            length: matchText.length,
            match: redacted,
            lineContent: line,
            confidence: Number(confidence.toFixed(2)),
            cwe: 'CWE-798'
          });
        }
      }
    }
    return issues;
  }
}
