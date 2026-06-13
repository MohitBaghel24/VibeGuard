import { VibeGuardConfig, ScanResult, Issue, Severity } from '../types/index.js';
import { discoverFiles, readFileContent } from '../utils/files.js';
import { calculateScore, calculateCategoryScore, deduplicateIssues } from './scoring.js';
import { SecretDetector, Detector } from './detectors/secrets.js';
import { SQLInjectionDetector } from './detectors/sql.js';
import { AuthChecker } from './detectors/auth.js';
import path from 'path';

export interface ScannerOptions {
  rootPath: string;
  config: VibeGuardConfig;
}

export const AllDetectors: Detector[] = [
  new SecretDetector(),
  new SQLInjectionDetector(),
  new AuthChecker()
];

export function scanFile(filePath: string, content: string, detectors: Detector[]): Issue[] {
  const issues: Issue[] = [];
  for (const detector of detectors) {
    const hasSupportedExt = detector.supportedExtensions.some(ext => 
      filePath.endsWith(ext) || (ext === '.env' && path.basename(filePath).startsWith('.env'))
    );
    if (hasSupportedExt || detector.supportedExtensions.includes('.*')) {
       issues.push(...detector.detect(filePath, content));
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
  let allIssues: Issue[] = [];

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
  
  const issuesBySeverity: Record<Severity, Issue[]> = {
    [Severity.LOW]: [],
    [Severity.MEDIUM]: [],
    [Severity.HIGH]: [],
    [Severity.CRITICAL]: [],
  };
  
  const issuesByDetector: Record<string, Issue[]> = {};
  
  for (const issue of dedupedIssues) {
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

  const { overallScore, rating } = calculateScore(dedupedIssues);
  
  const durationMs = Date.now() - startTime;

  return {
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    filesScanned: filePaths.length - filesSkipped,
    filesSkipped,
    linesScanned: totalLinesScanned,
    durationMs,
    issues: dedupedIssues,
    issuesBySeverity,
    issuesByDetector,
    categoryScores,
    overallScore,
    rating,
    passed: overallScore >= config.scoreThreshold
  };
}
