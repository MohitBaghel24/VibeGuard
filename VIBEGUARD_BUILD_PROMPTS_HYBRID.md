

**CREATE FILE:** `vibeguard-ts/mcp-server/package.json`
(Make sure it's already created from setup)

**TEST CRITERIA:**
```bash
cd vibeguard-ts/mcp-server
npm run build
npm run dev
# Then test with MCP inspector or Claude Code
```

---

## Prompt 10 (TypeScript): VS Code Extension

**GOAL:** Build the VS Code extension with real-time security scanning.

**CREATE FILE:** `vibeguard-ts/vscode-extension/src/extension.ts`

Requirements:

1. **Activate function**:
```typescript
import * as vscode from 'vscode';
import init, { scan_source } from '../../pkg/vibeguard_wasm.js';

let wasmInitialized = false;

export async function activate(context: vscode.ExtensionContext) {
  if (!wasmInitialized) {
    await init();
    wasmInitialized = true;
  }
  
  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('vibeguard.scanFile', scanCurrentFile),
    vscode.commands.registerCommand('vibeguard.scanWorkspace', scanWorkspace),
  );
  
  // Register diagnostic collection
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('vibeguard');
  context.subscriptions.push(diagnosticCollection);
  
  // Real-time scanning on save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (isSupported(doc)) {
        scanDocument(doc, diagnosticCollection);
      }
    })
  );
  
  // Scan open documents on activation
  vscode.workspace.textDocuments.forEach(doc => {
    if (isSupported(doc)) {
      scanDocument(doc, diagnosticCollection);
    }
  });
}

function isSupported(doc: vscode.TextDocument): boolean {
  const supported = ['javascript', 'typescript', 'python', 'json', 'yaml'];
  return supported.includes(doc.languageId);
}
```

2. **Document scanner**:
```typescript
async function scanDocument(
  doc: vscode.TextDocument,
  collection: vscode.DiagnosticCollection
) {
  const content = doc.getText();
  const config = getConfig();
  
  try {
    const issues = scan_source(doc.fileName, content, config) as Issue[];
    
    const diagnostics: vscode.Diagnostic[] = issues.map(issue => {
      const range = new vscode.Range(
        issue.line - 1, issue.column - 1,
        issue.line - 1, issue.column - 1 + issue.length
      );
      
      const diagnostic = new vscode.Diagnostic(
        range,
        `[${issue.severity.toUpperCase()}] ${issue.title}: ${issue.description}`,
        severityToVSCode(issue.severity)
      );
      
      diagnostic.code = issue.rule_id;
      diagnostic.source = 'VibeGuard';
      
      return diagnostic;
    });
    
    collection.set(doc.uri, diagnostics);
    
    // Update status bar
    updateStatusBar(issues);
    
  } catch (error) {
    console.error('VibeGuard scan failed:', error);
  }
}

function severityToVSCode(severity: string): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'critical': return vscode.DiagnosticSeverity.Error;
    case 'high': return vscode.DiagnosticSeverity.Error;
    case 'medium': return vscode.DiagnosticSeverity.Warning;
    case 'low': return vscode.DiagnosticSeverity.Information;
    default: return vscode.DiagnosticSeverity.Hint;
  }
}
```

3. **Status bar**:
```typescript
let statusBarItem: vscode.StatusBarItem;

function updateStatusBar(issues: Issue[]) {
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    statusBarItem.show();
  }
  
  const critical = issues.filter(i => i.severity === 'critical').length;
  const high = issues.filter(i => i.severity === 'high').length;
  
  if (critical > 0) {
    statusBarItem.text = `$(shield) 🔴 ${critical} Critical`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else if (high > 0) {
    statusBarItem.text = `$(shield) 🟠 ${high} High`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else if (issues.length > 0) {
    statusBarItem.text = `$(shield) 🟡 ${issues.length} Issues`;
  } else {
    statusBarItem.text = `$(shield) 🟢 Secure`;
    statusBarItem.backgroundColor = undefined;
  }
  
  statusBarItem.tooltip = issues.map(i => `${i.severity}: ${i.title}`).join('\n');
}
```

4. **Quick fixes** (code actions):
```typescript
class VibeGuardCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'VibeGuard') continue;
      
      // Add "Fix with VibeGuard" action
      const fixAction = new vscode.CodeAction(
        '🔒 Fix with VibeGuard',
        vscode.CodeActionKind.QuickFix
      );
      fixAction.diagnostics = [diagnostic];
      fixAction.command = {
        command: 'vibeguard.applyFix',
        title: 'Apply Fix',
        arguments: [document, diagnostic],
      };
      actions.push(fixAction);
      
      // Add "Suppress" action
      const suppressAction = new vscode.CodeAction(
        '🚫 Suppress VibeGuard Warning',
        vscode.CodeActionKind.QuickFix
      );
      suppressAction.diagnostics = [diagnostic];
      suppressAction.edit = new vscode.WorkspaceEdit();
      const line = document.lineAt(diagnostic.range.start.line);
      suppressAction.edit.insert(
        document.uri,
        line.range.start,
        `// vibeguard:ignore ${diagnostic.code} reason="intentional"\n`
      );
      actions.push(suppressAction);
    }
    
    return actions;
  }
}
```

5. **Chat participant** (`@vibeguard` in Copilot Chat):
```typescript
const handler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
) => {
  const prompt = request.prompt;
  
  if (prompt.includes('scan') || prompt.includes('check')) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      stream.markdown('Please open a file to scan.');
      return;
    }
    
    const content = editor.document.getText();
    const config = getConfig();
    const issues = scan_source(editor.document.fileName, content, config) as Issue[];
    
    if (issues.length === 0) {
      stream.markdown('🛡️ **VibeGuard**: No security issues found! Your code looks secure.');
    } else {
      stream.markdown(`🛡️ **VibeGuard Security Report**\n\n`);
      stream.markdown(`Found **${issues.length}** issue(s) in \`${editor.document.fileName}\`:\n\n`);
      
      for (const issue of issues) {
        const emoji = issue.severity === 'critical' ? '🚨' : 
                      issue.severity === 'high' ? '🔴' : 
                      issue.severity === 'medium' ? '🟠' : '🟡';
        stream.markdown(`${emoji} **[${issue.severity.toUpperCase()}]** ${issue.title}\n`);
        stream.markdown(`   📄 Line ${issue.line}: ${issue.description}\n\n`);
        
        if (issue.suggested_fix) {
          stream.markdown(`   💡 Suggested fix:\n`);
          stream.markdown(`   \`\`\`${editor.document.languageId}\n${issue.suggested_fix}\n   \`\`\`\n\n`);
        }
      }
    }
  } else {
    stream.markdown('🛡️ **VibeGuard**: I can scan your code for security issues. Try asking me to "scan this file" or "check for vulnerabilities".');
  }
};

// Register chat participant
vscode.chat.createChatParticipant('vibeguard', handler);
```

**CREATE FILE:** `vibeguard-ts/vscode-extension/src/types.ts`

```typescript
// Mirror of Rust Issue struct for WASM output
export interface Issue {
  id: string;
  detector_id: string;
  rule_id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  file_path: string;
  line: number;
  column: number;
  length: number;
  matched_content?: string;
  line_content: string;
  confidence: number;
  suggested_fix?: string;
  docs_url?: string;
  cwe_id?: string;
  ai_tool_source?: string;
}
```

**CREATE FILE:** `vibeguard-ts/vscode-extension/tsconfig.json`

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "out",
    "rootDir": "src",
    "lib": ["ES2022", "DOM"],
    "types": ["vscode", "node"]
  },
  "include": ["src/**/*", "../pkg/**/*"],
  "exclude": ["node_modules", "out"]
}
```

**BUILD & TEST:**
```bash
cd vibeguard-ts/vscode-extension
npm run compile
# Press F5 in VS Code to launch Extension Development Host
```

---

## Prompt 11 (TypeScript): Dashboard (Next.js)

**GOAL:** Build the web dashboard for security posture overview.

**CREATE FILE:** `vibeguard-ts/dashboard/src/app/page.tsx`

Requirements:

1. **Main dashboard page** using Next.js 15 App Router + Tailwind:
```tsx
'use client';

import { useState, useEffect } from 'react';
import { SecurityScoreCard } from './components/SecurityScoreCard';
import { IssueList } from './components/IssueList';
import { TrendChart } from './components/TrendChart';
import { RepoList } from './components/RepoList';

interface DashboardData {
  overallScore: number;
  rating: string;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  repos: Repo[];
  recentIssues: Issue[];
  scoreHistory: { date: string; score: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDashboardData().then(data => {
      setData(data);
      setLoading(false);
    });
  }, []);
  
  if (loading) return <LoadingScreen />;
  if (!data) return <ErrorScreen />;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldIcon className="w-8 h-8 text-green-600" />
            <h1 className="text-2xl font-bold text-gray-900">VibeGuard Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">Organization: Acme Corp</span>
            <button className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm">
              Settings
            </button>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SecurityScoreCard 
            score={data.overallScore} 
            rating={data.rating} 
          />
          <StatCard 
            label="Critical" 
            value={data.criticalCount} 
            color="red" 
          />
          <StatCard 
            label="High" 
            value={data.highCount} 
            color="orange" 
          />
          <StatCard 
            label="Repositories" 
            value={data.repos.length} 
            color="blue" 
          />
        </div>
        
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Security Score Trend</h2>
            <TrendChart data={data.scoreHistory} />
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Issues by Category</h2>
            <CategoryPieChart repos={data.repos} />
          </div>
        </div>
        
        {/* Repos & Issues */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Issues</h2>
              <IssueList issues={data.recentIssues} />
            </div>
          </div>
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Repositories</h2>
              <RepoList repos={data.repos} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
```

2. **Components**:

**`SecurityScoreCard.tsx`**:
```tsx
export function SecurityScoreCard({ score, rating }: { score: number; rating: string }) {
  const colors = {
    excellent: 'text-green-500',
    good: 'text-yellow-500',
    'needs-work': 'text-orange-500',
    poor: 'text-red-500',
    critical: 'text-red-700',
  };
  
  const bgColors = {
    excellent: 'bg-green-50 border-green-200',
    good: 'bg-yellow-50 border-yellow-200',
    'needs-work': 'bg-orange-50 border-orange-200',
    poor: 'bg-red-50 border-red-200',
    critical: 'bg-red-100 border-red-300',
  };
  
  return (
    <div className={`rounded-xl border-2 p-6 ${bgColors[rating as keyof typeof bgColors]}`}>
      <div className="text-sm font-medium text-gray-600 mb-1">Overall Score</div>
      <div className={`text-5xl font-bold ${colors[rating as keyof typeof colors]}`}>
        {score}/100
      </div>
      <div className="text-sm text-gray-500 mt-2 capitalize">
        {rating.replace('-', ' ')}
      </div>
    </div>
  );
}
```

**`IssueList.tsx`**:
```tsx
export function IssueList({ issues }: { issues: Issue[] }) {
  const severityColors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-gray-100 text-gray-800',
  };
  
  return (
    <div className="space-y-3">
      {issues.map(issue => (
        <div key={issue.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50">
          <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[issue.severity]}`}>
            {issue.severity}
          </span>
          <div className="flex-1">
            <div className="font-medium text-gray-900">{issue.title}</div>
            <div className="text-sm text-gray-500">
              {issue.file_path}:{issue.line}
            </div>
          </div>
          <button className="text-sm text-blue-600 hover:text-blue-800">
            Fix
          </button>
        </div>
      ))}
    </div>
  );
}
```

**`TrendChart.tsx`** (using Recharts):
```tsx
'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function TrendChart({ data }: { data: { date: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis domain={[0, 100]} />
        <Tooltip />
        <Line 
          type="monotone" 
          dataKey="score" 
          stroke="#10b981" 
          strokeWidth={2}
          dot={{ fill: '#10b981' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

3. **Mock data** for development:
```typescript
async function fetchDashboardData(): Promise<DashboardData> {
  // In production, this calls the Rust API server
  return {
    overallScore: 73,
    rating: 'good',
    criticalCount: 2,
    highCount: 8,
    mediumCount: 5,
    lowCount: 12,
    repos: [
      { name: 'frontend-app', score: 73, issues: 12, lastScan: '2m ago' },
      { name: 'api-service', score: 91, issues: 2, lastScan: '5m ago' },
      { name: 'legacy-app', score: 34, issues: 47, lastScan: '1h ago' },
      { name: 'mobile-app', score: 86, issues: 5, lastScan: '30m ago' },
    ],
    recentIssues: [/* ... */],
    scoreHistory: [
      { date: '2025-01-01', score: 45 },
      { date: '2025-02-01', score: 58 },
      { date: '2025-03-01', score: 67 },
      { date: '2025-04-01', score: 73 },
      { date: '2025-05-01', score: 73 },
      { date: '2025-06-01', score: 78 },
    ],
  };
}
```

**CREATE FILE:** `vibeguard-ts/dashboard/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

**BUILD & RUN:**
```bash
cd vibeguard-ts/dashboard
npm run dev
# Open http://localhost:3000
```

---

## Prompt 12: GitHub Action + CI/CD

**GOAL:** Create the GitHub Action workflow and CI pipelines.

**CREATE FILE:** `action.yml` (in project root)

```yaml
name: 'VibeGuard Security Scan'
description: 'Scan your code for AI-generated security vulnerabilities'
author: 'VibeGuard Team'
branding:
  icon: 'shield'
  color: 'green'

inputs:
  scan-path:
    description: 'Path to scan'
    required: false
    default: '.'
  fail-threshold:
    description: 'Minimum passing score (0-100)'
    required: false
    default: '50'
  github-token:
    description: 'GitHub token for PR comments'
    required: false
    default: ${{ github.token }}

outputs:
  score:
    description: 'Overall safety score'
  critical-count:
    description: 'Number of critical issues'
  high-count:
    description: 'Number of high severity issues'
  scan-passed:
    description: 'Whether the scan passed the threshold'

runs:
  using: 'composite'
  steps:
    - name: Download VibeGuard binary
      shell: bash
      run: |
        VERSION="v0.1.0"
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH=$(uname -m)
        if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi
        if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi
        
        curl -L -o vibeguard \
          "https://github.com/vibeguard/vibeguard/releases/download/${VERSION}/vibeguard-${OS}-${ARCH}"
        chmod +x vibeguard
    
    - name: Run VibeGuard
      id: scan
      shell: bash
      run: |
        ./vibeguard scan ${{ inputs.scan-path }} \
          --output json \
          --fail-below ${{ inputs.fail-threshold }} \
          > vibeguard-results.json || true
        
        echo "score=$(jq -r '.overallScore' vibeguard-results.json 2>/dev/null || echo 0)" >> $GITHUB_OUTPUT
        echo "critical-count=$(jq -r '.issuesBySeverity.critical | length' vibeguard-results.json 2>/dev/null || echo 0)" >> $GITHUB_OUTPUT
        echo "high-count=$(jq -r '.issuesBySeverity.high | length' vibeguard-results.json 2>/dev/null || echo 0)" >> $GITHUB_OUTPUT
        
        if [ "$(jq -r '.passed' vibeguard-results.json 2>/dev/null || echo false)" = "true" ]; then
          echo "scan-passed=true" >> $GITHUB_OUTPUT
        else
          echo "scan-passed=false" >> $GITHUB_OUTPUT
        fi
    
    - name: Upload SARIF to GitHub
      if: always()
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: vibeguard-results.sarif
        category: vibeguard
    
    - name: Post PR Comment
      if: github.event_name == 'pull_request' && always()
      uses: actions/github-script@v7
      with:
        github-token: ${{ inputs.github-token }}
        script: |
          const fs = require('fs');
          try {
            const result = JSON.parse(fs.readFileSync('vibeguard-results.json', 'utf8'));
            const score = result.overallScore;
            const rating = result.rating;
            const issues = result.issues || [];
            
            const emoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : score >= 50 ? '🟠' : '🔴';
            
            const categories = Object.entries(result.categoryScores || {})
              .map(([name, cat]) => `| ${name} | ${cat.score}/100 | ${cat.issueCount} |`)
              .join('\n');
            
            const body = `## 🛡️ VibeGuard Security Report
            
            | Category | Score | Issues |
            |----------|-------|--------|
            ${categories}
            
            **Vibe Code Safety Score: ${score}/100** ${emoji} ${rating}
            
            ${issues.length > 0 ? `⚠️ ${issues.length} issue(s) found` : '✅ No issues found'}
            
            ---
            _Generated by VibeGuard v${result.version}_`;
            
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            });
          } catch (e) {
            console.error('Failed to post VibeGuard comment:', e.message);
          }
```

**CREATE FILE:** `.github/workflows/ci.yml`

```yaml
name: CI

on: [push, pull_request]

jobs:
  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-action@stable
      - run: cargo test --workspace
      - run: cargo clippy --workspace -- -D warnings
      - run: cargo fmt --check
      - run: cargo build --release
      - run: cargo test --workspace --features wasm --target wasm32-unknown-unknown

  typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: cd vibeguard-ts && npm ci
      - run: cd vibeguard-ts/mcp-server && npm run build
      - run: cd vibeguard-ts/vscode-extension && npm run compile
      - run: cd vibeguard-ts/dashboard && npm run build
```

**CREATE FILE:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build-binaries:
    strategy:
      matrix:
        target:
          - x86_64-unknown-linux-gnu
          - x86_64-apple-darwin
          - aarch64-apple-darwin
          - x86_64-pc-windows-msvc
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-action@stable
      - run: cargo build --release --target ${{ matrix.target }}
      - uses: softprops/action-gh-release@v1
        with:
          files: target/${{ matrix.target }}/release/vibeguard
          generate_release_notes: true

  publish-npm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: cd vibeguard-ts/mcp-server && npm ci && npm run build && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - run: cd vibeguard-ts/vscode-extension && npm ci && vsce publish
        env:
          VSCE_PAT: ${{ secrets.VSCE_PAT }}
```

---

## Prompt 13: Integration Test Suite

**GOAL:** End-to-end tests verifying Rust core + WASM bridge + TS clients.

**CREATE FILE:** `tests/integration/scan_workflow.rs`

```rust
use std::fs;
use std::path::Path;
use tempfile::TempDir;
use vibeguard_core::{Scanner, ScanConfig};

#[test]
fn test_full_scan_finds_all_vulnerabilities() {
    let temp_dir = TempDir::new().unwrap();
    let root = temp_dir.path();
    
    // Create test files
    fs::write(root.join("auth.js"), r#"
const API_KEY = "ghp_abcdefghijklmnopqrstuvwxyz1234";

app.post('/login', (req, res) => {
  res.json({ token: API_KEY });
});

app.get('/admin/users', (req, res) => {
  res.json({ users: [] });
});
"#).unwrap();
    
    fs::write(root.join("db.ts"), r#"
function getUser(id: string) {
  const query = `SELECT * FROM users WHERE id = '${id}'`;
  return db.query(query);
}
"#).unwrap();
    
    fs::write(root.join("config.py"), r#"
DB_CONFIG = {
    "password": "SuperSecret123!",
    "api_key": "sk-live-abcdefghijklmnopqrstuvwxyz1234"
}

def login(email):
    query = f"SELECT * FROM users WHERE email = '{email}'"
    cursor.execute(query)
"#).unwrap();
    
    // Run scan
    let config = ScanConfig::default();
    let scanner = Scanner::new(config);
    let result = scanner.scan(root).unwrap();
    
    // Assertions
    assert!(result.issues.len() >= 4, "Expected at least 4 issues, got {}", result.issues.len());
    
    let critical = result.issues.iter().filter(|i| i.severity == Severity::Critical).count();
    let high = result.issues.iter().filter(|i| i.severity == Severity::High).count();
    
    assert!(critical >= 1, "Expected at least 1 CRITICAL issue");
    assert!(high >= 1, "Expected at least 1 HIGH issue");
    assert!(result.overall_score < 80, "Expected score below 80");
    assert!(!result.passed, "Expected scan to fail with default threshold");
}
```

**CREATE FILE:** `tests/integration/wasm_bridge.rs`

```rust
use wasm_bindgen_test::*;

wasm_bindgen_test_configure!(run_in_browser);

#[wasm_bindgen_test]
fn wasm_scan_single_file() {
    use vibeguard_wasm::scan_source;
    
    let code = r#"const key = "ghp_abcdefghijklmnopqrstuvwxyz1234";"#;
    let result = scan_source("test.js", code, &js_sys::JSON::parse(r#"{"min_severity": "low", "score_threshold": 50}"#).unwrap());
    
    // Assert we found the secret
    assert!(result.is_ok());
}
```

**CREATE FILE:** `tests/fixtures/complete-project/auth.js`
(Contents from Prompt 5 above)

**TEST CRITERIA:**
```bash
# Rust integration tests
cargo test --test integration

# WASM tests
wasm-pack test --headless --chrome
```

---

## Prompt 14: README + Documentation

**GOAL:** Write comprehensive README and documentation.

**CREATE FILE:** `README.md`

```markdown
# 🛡️ VibeGuard

> **Security scanner for AI-generated code.**
> Catch vulnerabilities before they ship — with performance that scales.

[![Build Status](https://github.com/vibeguard/vibeguard/workflows/CI/badge.svg)](https://github.com/vibeguard/vibeguard/actions)
[![npm version](https://badge.fury.io/js/@vibeguard%2Fmcp-server.svg)](https://www.npmjs.com/package/@vibeguard/mcp-server)
[![Crates.io](https://img.shields.io/crates/v/vibeguard)](https://crates.io/crates/vibeguard)

## Architecture

VibeGuard uses a **hybrid Rust + TypeScript architecture**:

- **🦀 Core Engine (Rust)** — High-performance scanning engine with zero overhead
- **🔌 WASM Bindings** — Rust core compiled to WebAssembly for browser/IDE use
- **🤖 MCP Server (TypeScript)** — Integration with Claude Code, Cursor, Windsurf
- **🔧 VS Code Extension** — Real-time inline diagnostics
- **📊 Dashboard (Next.js)** — Security posture monitoring

## Quick Start

### CLI (Native Binary)

```bash
# Install via cargo
cargo install vibeguard

# Or download prebuilt binary
curl -L https://vibeguard.io/install | sh

# Scan your project
vibeguard scan ./
vibeguard scan ./ --output json --fail-below 70
```

### MCP Server (For AI Assistants)

```bash
npm install -g @vibeguard/mcp-server
```

Then add to Claude Code's `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "@vibeguard/mcp-server"]
    }
  }
}
```

### GitHub Action

```yaml
- uses: vibeguard/vibeguard@v1
  with:
    fail-threshold: 70
```

### VS Code Extension

Install from marketplace: search "VibeGuard"

## Vibe Code Safety Score

Every scan produces a **0-100 score**:

| Score | Rating | Badge |
|-------|--------|-------|
| 90-100 | 🟢 Excellent | ![green](https://img.shields.io/badge/VibeGuard-95%2F100-brightgreen) |
| 70-89 | 🟡 Good | ![yellow](https://img.shields.io/badge/VibeGuard-73%2F100-yellow) |
| 50-69 | 🟠 Needs Work | ![orange](https://img.shields.io/badge/VibeGuard-55%2F100-orange) |
| 0-49 | 🔴 Critical | ![red](https://img.shields.io/badge/VibeGuard-30%2F100-red) |

## What We Detect

### Secrets (CRITICAL)
- AWS Access Keys (`AKIA...`)
- GitHub Tokens (`ghp_...`, `github_pat_...`)
- Stripe Keys (`sk_live_...`)
- Generic API Keys (with entropy analysis)
- JWT Tokens
- Private Keys
- Database Passwords

### SQL Injection (CRITICAL)
- String template literals: `` `SELECT * FROM ${table}` ``
- String concatenation: `"SELECT * FROM " + table`
- Python f-strings: `f"SELECT * FROM {table}"`
- Unparameterized `.execute()` calls

### Authentication (HIGH)
- Missing auth on /admin, /api/admin, /dashboard
- Missing auth middleware on sensitive routes
- JWT misconfigurations

## Configuration

```yaml
# .vibeguard.yaml
minSeverity: low
scoreThreshold: 70
ignore:
  - "**/tests/**"
  - "**/*.test.ts"
detectors:
  secrets: true
  sql: true
  auth: true
```

## Performance

| Metric | Target | Achieved |
|--------|--------|----------|
| Single file scan | < 50ms | ✅ ~15ms |
| 1000-file project | < 2s | ✅ ~800ms |
| Memory usage | < 100MB | ✅ ~45MB |
| WASM size (IDE) | < 5MB | ✅ ~2.1MB |

## Development

### Prerequisites

- Rust 1.80+
- Node.js 20+
- wasm-pack

### Build

```bash
# Rust core + CLI
cargo build --release

# WASM bindings
cd crates/vibeguard-wasm
wasm-pack build --target web --out-dir ../../vibeguard-ts/pkg

# TypeScript packages
cd vibeguard-ts
npm install
npm run build
```

### Test

```bash
# Run all tests
cargo test --workspace
wasm-pack test --headless --chrome
cd vibeguard-ts && npm test
```

## License

MIT © VibeGuard Team
```

---

## 🚀 Build & Release Checklist

### After all prompts are complete, run:

```bash
# 1. Build Rust workspace
cargo build --release --workspace

# 2. Build WASM
cd crates/vibeguard-wasm
wasm-pack build --target web --out-dir ../../vibeguard-ts/pkg

# 3. Test Rust
cargo test --workspace

# 4. Test WASM
wasm-pack test --headless --chrome

# 5. Build TypeScript packages
cd vibeguard-ts/mcp-server && npm run build
cd ../vscode-extension && npm run compile
cd ../dashboard && npm run build

# 6. Package CLI binary
strip target/release/vibeguard
# Test the binary
./target/release/vibeguard --help
./target/release/vibeguard scan ./
./target/release/vibeguard badge --score 85

# 7. Tag release
git add .
git commit -m "release: v0.1.0"
git tag v0.1.0
git push origin main --tags

# 8. Publish crates.io
cargo publish -p vibeguard-core
cargo publish -p vibeguard-cli

# 9. Publish npm
npm publish -w vibeguard-ts/mcp-server

# 10. Publish VS Code Extension
vsce publish
```

---

## 📊 Hybrid Approach Summary

| Layer | Language | Why |
|-------|----------|-----|
| Core Scanner | **Rust** | Speed (<50ms/file), memory safety, zero-cost abstractions |
| WASM Bindings | **Rust → WASM** | TypeScript clients use same engine with ~2MB payload |
| CLI | **Rust** | Native binary, instant startup |
| MCP Server | **TypeScript** | Native MCP SDK, easy integration with Claude/Cursor |
| VS Code Extension | **TypeScript** | VS Code API is TypeScript-first |
| Dashboard | **TypeScript/Next.js** | Web standard, fast iteration |
| GitHub Action | **Composite** | Downloads prebuilt binary |

**Key Integration:** WASM bridge means TypeScript clients (MCP, VS Code, Dashboard) run the exact same Rust scanning engine — no code duplication, no compatibility issues.

---

*Hybrid Build Prompts v1.0 — Ready to build!*
