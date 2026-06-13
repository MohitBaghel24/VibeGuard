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

function calculatePenalty(issues: Issue[]): number {
  const fileIssues = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!fileIssues.has(issue.filePath)) fileIssues.set(issue.filePath, []);
    fileIssues.get(issue.filePath)!.push(issue);
  }

  let totalPenalty = 0;
  for (const fIssues of fileIssues.values()) {
    let filePenalty = 0;
    const sortedIssues = [...fIssues].sort((a, b) => SEVERITY_WEIGHTS[b.severity] - SEVERITY_WEIGHTS[a.severity]);
    
    for (let i = 0; i < sortedIssues.length; i++) {
      const issue = sortedIssues[i];
      let basePenalty = 0;
      if (issue.severity === Severity.CRITICAL) basePenalty = 15;
      else if (issue.severity === Severity.HIGH) basePenalty = 8;
      else if (issue.severity === Severity.MEDIUM) basePenalty = 4;
      else if (issue.severity === Severity.LOW) basePenalty = 1;
      
      // Diminishing returns: 1st issue = 100%, 2nd = 50%, 3rd = 25%
      filePenalty += basePenalty * Math.pow(0.5, i);
    }
    // Cap maximum penalty for a single file to 25 points to prevent one file from tanking the project
    totalPenalty += Math.min(25, filePenalty);
  }
  return totalPenalty;
}

export function calculateCategoryScore(name: string, issues: Issue[]): CategoryScore {
  let maxSeverity: Severity | null = null;
  
  for (const issue of issues) {
    if (!maxSeverity || SEVERITY_WEIGHTS[issue.severity] > SEVERITY_WEIGHTS[maxSeverity]) {
      maxSeverity = issue.severity;
    }
  }
  
  const penalty = calculatePenalty(issues);
  const score = Math.max(0, Math.round(100 - penalty));
  
  return {
    name,
    score,
    issueCount: issues.length,
    maxSeverity,
  };
}

export function calculateScore(issues: Issue[]): { overallScore: number; rating: ScoreRating } {
  const penalty = calculatePenalty(issues);
  const overallScore = Math.max(0, Math.round(100 - penalty));
  
  let rating: ScoreRating = 'critical';
  for (const [r, [min, max]] of Object.entries(SCORE_RANGES)) {
    if (overallScore >= min && overallScore <= max) {
      rating = r as ScoreRating;
      break;
    }
  }
  
  return { overallScore, rating };
}

