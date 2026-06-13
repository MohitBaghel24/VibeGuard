import { ScanResult, Issue } from '../types/index.js';

export function toSarif(result: ScanResult): string {
  const sarif: any = {
    version: "2.1.0",
    $schema: "http://json.schemastore.org/sarif-2.1.0-rtm.5",
    runs: [
      {
        tool: {
          driver: {
            name: "VibeGuard",
            informationUri: "https://vibeguard.io",
            version: result.version,
            rules: []
          }
        },
        results: []
      }
    ]
  };

  const ruleIds = new Set<string>();

  for (const issue of result.issues) {
    if (!ruleIds.has(issue.detectorId)) {
      ruleIds.add(issue.detectorId);
      let shortDescription: string;
      switch (issue.detectorId) {
        case "secrets": shortDescription = "Hardcoded Secret"; break;
        case "sql": shortDescription = "SQL Injection"; break;
        case "auth": shortDescription = "Missing Authentication"; break;
        default: shortDescription = "Security Issue"; break;
      }
      sarif.runs[0].tool.driver.rules.push({
        id: issue.detectorId,
        shortDescription: { text: shortDescription }
      });
    }

    let level = "warning";
    if (issue.severity === "critical" || issue.severity === "high") {
      level = "error";
    } else if (issue.severity === "low") {
      level = "note";
    }

    sarif.runs[0].results.push({
      ruleId: issue.detectorId,
      level: level,
      message: {
        text: issue.description
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: issue.filePath
            },
            region: {
              startLine: issue.line,
              startColumn: issue.column,
              endColumn: issue.column + issue.length
            }
          }
        }
      ]
    });
  }

  return JSON.stringify(sarif, null, 2);
}
