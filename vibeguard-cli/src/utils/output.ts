import chalk from 'chalk';
import { ScanResult, ScoreRating, Severity } from '../types/index.js';

function getRatingEmoji(rating: ScoreRating): string {
  switch (rating) {
    case 'excellent': return '🟢';
    case 'good': return '🟡';
    case 'needs-work': return '🟠';
    case 'poor': return '🔴';
    case 'critical': return '⚫';
  }
}

function getRatingLabel(rating: ScoreRating): string {
  switch (rating) {
    case 'excellent': return 'Excellent';
    case 'good': return 'Good';
    case 'needs-work': return 'Needs Work';
    case 'poor': return 'Poor';
    case 'critical': return 'Critical';
  }
}

export function formatTextReport(result: ScanResult): string {
  const { version, filesScanned, durationMs, linesScanned, overallScore, rating, issuesBySeverity, issuesByDetector, passed, issues, categoryScores } = result;

  const emoji = getRatingEmoji(rating);
  const ratingLabel = getRatingLabel(rating);

  const secretsScore = categoryScores['Secret & Credential Detector']?.score ?? 100;
  const secretsIssues = categoryScores['Secret & Credential Detector']?.issueCount ?? 0;
  
  const sqlScore = categoryScores['SQL Injection Detector']?.score ?? 100;
  const sqlIssues = categoryScores['SQL Injection Detector']?.issueCount ?? 0;

  const authScore = categoryScores['Authentication Checker']?.score ?? 100;
  const authIssues = categoryScores['Authentication Checker']?.issueCount ?? 0;

  const criticalCount = issuesBySeverity[Severity.CRITICAL].length;
  const highCount = issuesBySeverity[Severity.HIGH].length;
  const mediumCount = issuesBySeverity[Severity.MEDIUM].length;
  const lowCount = issuesBySeverity[Severity.LOW].length;

  let report = `
🛡️  ${chalk.bold(`VibeGuard Security Report v${version}`)}
════════════════════════════════════════

📁 Files scanned:     ${filesScanned}
⏱️  Duration:          ${durationMs}ms
📊 Lines analyzed:    ${linesScanned}

┌─────────────────────────────────────────┐
│  Vibe Code Safety Score: ${overallScore.toString().padStart(3)}/100   │
│  Rating: ${emoji} ${ratingLabel.padEnd(28)}│
└─────────────────────────────────────────┘

🔒 Secrets:     ${secretsScore.toString().padStart(3)}/100  (${secretsIssues} issues)
🗄️  SQL:        ${sqlScore.toString().padStart(3)}/100     (${sqlIssues} issues)
🔑 Auth:        ${authScore.toString().padStart(3)}/100     (${authIssues} issues)

🚨 CRITICAL: ${criticalCount}
🔴 HIGH:     ${highCount}
🟠 MEDIUM:   ${mediumCount}
🟡 LOW:      ${lowCount}
`;

  if (issues.length > 0) {
    report += `\nTop Issues:\n─────────────────────────────────────────\n`;
    
    const sortedIssues = [...issues].sort((a, b) => {
      const weight = { [Severity.CRITICAL]: 4, [Severity.HIGH]: 3, [Severity.MEDIUM]: 2, [Severity.LOW]: 1 };
      return weight[b.severity] - weight[a.severity];
    });

    for (const issue of sortedIssues.slice(0, 20)) {
      let icon = '🟡';
      let sevLabel = '[LOW]';
      let color = chalk.yellow;

      if (issue.severity === Severity.CRITICAL) { icon = '🚨'; sevLabel = '[CRITICAL]'; color = chalk.red.bold; }
      else if (issue.severity === Severity.HIGH) { icon = '🔴'; sevLabel = '[HIGH]'; color = chalk.red; }
      else if (issue.severity === Severity.MEDIUM) { icon = '🟠'; sevLabel = '[MEDIUM]'; color = chalk.hex('#FFA500'); }

      report += `${icon} ${color(sevLabel)} ${issue.title}\n`;
      report += `📄 ${issue.filePath}:${issue.line}\n`;
      report += `💡 ${issue.description}\n\n`;
    }
    
    if (issues.length > 20) {
      report += `... and ${issues.length - 20} more issues.\n\n`;
    }
  }

  const statusMsg = passed ? chalk.green.bold('PASSED') : chalk.red.bold('FAILED');
  report += `✅ Scan ${statusMsg}\n`;

  return report;
}

export function formatJSONReport(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

export function formatBadge(score: number, rating: ScoreRating): string {
  let color = 'red';
  if (rating === 'excellent') color = 'brightgreen';
  else if (rating === 'good') color = 'green';
  else if (rating === 'needs-work') color = 'yellow';
  else if (rating === 'poor') color = 'orange';

  return `[![VibeGuard Score](https://img.shields.io/badge/VibeGuard-${score}%2F100-${color})](https://vibeguard.io)`;
}

export function printProgress(current: number, total: number, fileName: string): void {
  const percent = total === 0 ? 0 : Math.round((current / total) * 100);
  const barLen = 10;
  const filled = Math.round((percent / 100) * barLen);
  const bar = '█'.repeat(filled) + '░'.repeat(barLen - filled);
  
  const shortName = fileName.length > 30 ? '...' + fileName.substring(fileName.length - 27) : fileName.padEnd(30);
  
  process.stdout.write(`\r[${bar}] ${percent}% (${current}/${total}) scanning ${shortName}`);
}
