import { VibeGuardConfig, ScanResult, Issue, Severity } from '../types/index.js';
import { discoverFiles, readFileContent } from '../utils/files.js';
import { stripFalsePositives } from '../utils/falsePositives.js';
import { calculateScore, calculateCategoryScore, deduplicateIssues } from './scoring.js';
import { SecretDetector, Detector } from './detectors/secrets.js';
import { SQLInjectionDetector } from './detectors/sql.js';
import { AuthChecker } from './detectors/auth.js';
import { XSSDetector } from './detectors/xss.js';
import { PathTraversalDetector } from './detectors/pathTraversal.js';
import { AIHallucinationDetector } from './detectors/hallucinations.js';
import path from 'path';

export interface ScannerOptions {
  rootPath: string;
  config: VibeGuardConfig;
}

export const AllDetectors: Detector[] = [
  new SecretDetector(),
  new SQLInjectionDetector(),
  new AuthChecker(),
  new AIHallucinationDetector(),
  new XSSDetector(),
  new PathTraversalDetector()
];

export function scanFile(filePath: string, content: string, detectors: Detector[]): Issue[] {
  const issues: Issue[] = [];
  const cleanContent = stripFalsePositives(content, filePath);
  
  for (const detector of detectors) {
    const hasSupportedExt = detector.supportedExtensions.some(ext => 
      filePath.endsWith(ext) || (ext === '.env' && path.basename(filePath).startsWith('.env'))
    );
    if (hasSupportedExt || detector.supportedExtensions.includes('.*')) {
       // Pass cleanContent to avoid matching inside comments, but maybe detector needs original?
       // Currently, passing cleanContent works because indices align exactly.
       issues.push(...detector.detect(filePath, cleanContent));
    }
  }
  
  // Restore original line content for better output formatting
  const lines = content.split('\n');
  for (const issue of issues) {
    if (issue.line > 0 && issue.line <= lines.length) {
      issue.lineContent = lines[issue.line - 1];
    }
  }
  
  return issues;
}

export async function scan(options: ScannerOptions): Promise<ScanResult> {
  const startTime = Date.now();
  const { rootPath, config } = options;

  const filePaths = await discoverFiles(rootPath, config);
  
  const activeDetectors = AllDetectors.filter(d => config.detectors[d.id] !== false);

  let totalLinesScanned = 0;
  let filesSkipped = 0;
  const allIssues: Issue[] = [];

  // Initialize any detectors that need rootPath access
  for (const detector of activeDetectors) {
    if ('initialize' in detector && typeof detector.initialize === 'function') {
      await detector.initialize(rootPath);
    }
  }

  for (const filePath of filePaths) {
    const absPath = path.resolve(rootPath, filePath);
    const content = await readFileContent(absPath);
    if (content === null) {
      filesSkipped++;
      continue;
    }
    
    totalLinesScanned += content.split('\n').length;
    
    const fileIssues = scanFile(filePath, content, activeDetectors);
    allIssues.push(...fileIssues);
  }

  const dedupedIssues = deduplicateIssues(allIssues);
  const finalIssues: Issue[] = [];
  
  for (const issue of dedupedIssues) {
    if (issue.ruleId && config.rules && config.rules[issue.ruleId] !== undefined) {
      const ruleOverride = config.rules[issue.ruleId];
      if (ruleOverride === false) continue; // Rule is disabled
      if (typeof ruleOverride === 'string') {
        issue.severity = ruleOverride as Severity; // Override severity
      }
    }
    finalIssues.push(issue);
  }
  
  const issuesBySeverity: Record<Severity, Issue[]> = {
    [Severity.LOW]: [],
    [Severity.MEDIUM]: [],
    [Severity.HIGH]: [],
    [Severity.CRITICAL]: [],
  };
  
  const issuesByDetector: Record<string, Issue[]> = {};
  
  for (const issue of finalIssues) {
    issuesBySeverity[issue.severity].push(issue);
    
    if (!issuesByDetector[issue.detectorId]) {
      issuesByDetector[issue.detectorId] = [];
    }
    issuesByDetector[issue.detectorId].push(issue);
  }

  const categoryScores: Record<string, ReturnType<typeof calculateCategoryScore>> = {};
  for (const detector of activeDetectors) {
    categoryScores[detector.name] = calculateCategoryScore(detector.name, issuesByDetector[detector.id] || []);
  }

  const { overallScore, rating } = calculateScore(finalIssues);
  
  const durationMs = Date.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    filesScanned: filePaths.length - filesSkipped,
    filesSkipped,
    linesScanned: totalLinesScanned,
    durationMs,
    issues: finalIssues,
    issuesBySeverity,
    issuesByDetector,
    categoryScores,
    overallScore,
    rating,
    passed: overallScore >= config.scoreThreshold
  };
}
