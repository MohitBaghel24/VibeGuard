export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  [Severity.LOW]: 1,
  [Severity.MEDIUM]: 4,
  [Severity.HIGH]: 8,
  [Severity.CRITICAL]: 15,
};

export type ScoreRating = 'excellent' | 'good' | 'needs-work' | 'poor' | 'critical';

export const SCORE_RANGES: Record<ScoreRating, [number, number]> = {
  excellent: [90, 100],
  good: [70, 89],
  'needs-work': [50, 69],
  poor: [25, 49],
  critical: [0, 24],
};

export interface Issue {
  id: string; // unique: `${detectorId}:${hash(filePath,line,column)}`
  detectorId: string;
  ruleId?: string; // Stable identifier for customization
  title: string;
  description: string;
  severity: Severity;
  filePath: string; // relative to scan root
  line: number; // 1-indexed
  column: number; // 1-indexed
  length: number;
  match: string; // the matched content, will be redacted for secrets
  lineContent: string; // full line
  confidence: number; // 0-1
  rawMatch?: string; // unredacted match, used for automated fixing
  fix?: string; // optional suggested fix
  replacement?: string; // string to auto-replace match with
  docsUrl?: string;
  cwe?: string;
}

export interface CategoryScore {
  name: string;
  score: number; // 0-100
  issueCount: number;
  maxSeverity: Severity | null;
}

export interface ScanResult {
  timestamp: string; // ISO 8601
  version: string;
  filesScanned: number;
  filesSkipped: number;
  linesScanned: number;
  durationMs: number;
  issues: Issue[];
  issuesBySeverity: Record<Severity, Issue[]>;
  issuesByDetector: Record<string, Issue[]>;
  categoryScores: Record<string, CategoryScore>;
  overallScore: number;
  rating: ScoreRating;
  passed: boolean;
}

export interface VibeGuardConfig {
  minSeverity: Severity;
  scoreThreshold: number; // 0-100
  ignore: string[];
  extensions: string[];
  maxFileSize: number; // bytes
  detectors: Record<string, boolean>;
  outputFormat: 'text' | 'json' | 'sarif';
  showBadge: boolean;
}

export interface FalsePositiveFilter {
  name: string;
  test: (match: string, line: string, filePath: string) => boolean;
}

export interface SecretPattern {
  id: string;
  name: string;
  regex: RegExp;
  severity: Severity;
  entropyThreshold?: number;
  falsePositiveFilters: FalsePositiveFilter[];
}

export function isValidSeverity(value: unknown): value is Severity {
  return typeof value === 'string' && Object.values(Severity).includes(value as Severity);
}

export function isValidScoreRating(value: unknown): value is ScoreRating {
  return (
    typeof value === 'string' &&
    ['excellent', 'good', 'needs-work', 'poor', 'critical'].includes(value)
  );
}

export function isIssue(value: unknown): value is Issue {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.detectorId === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.description === 'string' &&
    isValidSeverity(obj.severity) &&
    typeof obj.filePath === 'string' &&
    typeof obj.line === 'number' &&
    typeof obj.column === 'number' &&
    typeof obj.length === 'number' &&
    typeof obj.match === 'string' &&
    typeof obj.lineContent === 'string' &&
    typeof obj.confidence === 'number'
  );
}
