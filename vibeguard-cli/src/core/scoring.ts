import { Issue, CategoryScore, ScoreRating, Severity, SCORE_RANGES, SEVERITY_WEIGHTS } from '../types/index.js';

export function deduplicateIssues(issues: Issue[]): Issue[] {
  const seen = new Set<string>();
  const deduped: Issue[] = [];
  for (const issue of issues) {
    const key = `${issue.filePath}:${issue.line}:${issue.detectorId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(issue);
    }
  }
  return deduped;
}

export function calculateCategoryScore(name: string, issues: Issue[]): CategoryScore {
  let score = 100;
  let maxSeverity: Severity | null = null;
  
  for (const issue of issues) {
    if (!maxSeverity || SEVERITY_WEIGHTS[issue.severity] > SEVERITY_WEIGHTS[maxSeverity]) {
      maxSeverity = issue.severity;
    }
    
    if (issue.severity === Severity.CRITICAL) score -= 15;
    else if (issue.severity === Severity.HIGH) score -= 8;
    else if (issue.severity === Severity.MEDIUM) score -= 4;
    else if (issue.severity === Severity.LOW) score -= 1;
  }
  
  return {
    name,
    score: Math.max(0, score),
    issueCount: issues.length,
    maxSeverity,
  };
}

export function calculateScore(issues: Issue[]): { overallScore: number; rating: ScoreRating } {
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === Severity.CRITICAL) score -= 15;
    else if (issue.severity === Severity.HIGH) score -= 8;
    else if (issue.severity === Severity.MEDIUM) score -= 4;
    else if (issue.severity === Severity.LOW) score -= 1;
  }
  
  const overallScore = Math.max(0, score);
  
  let rating: ScoreRating = 'critical';
  for (const [r, [min, max]] of Object.entries(SCORE_RANGES)) {
    if (overallScore >= min && overallScore <= max) {
      rating = r as ScoreRating;
      break;
    }
  }
  
  return { overallScore, rating };
}
