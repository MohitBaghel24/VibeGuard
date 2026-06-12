# VibeGuard — Build Prompts (Hybrid Architecture)
**Generated from PRD, TRD, and App Flow**
**Project Path:** `/Users/mohitbaghel/Desktop/VibeGuard`

> **Instructions:** Paste each prompt below into Antigravity ONE AT A TIME, in order. Wait for each step to complete before moving to the next. Each prompt is self-contained with all context needed.

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────┐
│                    VIBEGUARD HYBRID STACK                    │
├──────────────────────────┬──────────────────────────────────┤
│     🦀 RUST LAYER        │     📘 TYPESCRIPT LAYER          │
│                          │                                  │
│  ┌──────────────────┐    │  ┌──────────────────────────┐   │
│  │  Core Scanner    │    │  │  MCP Server              │   │
│  │  Engine          │    │  │  (Node.js + MCP SDK)     │   │
│  │  (tree-sitter,   │    │  │                          │   │
│  │   rayon, regex)  │    │  │  Calls: vibeguard scan   │   │
│  └────────┬─────────┘    │  │  --output json           │   │
│           │              │  └──────────────┬───────────┘   │
│  ┌────────┴─────────┐    │                 │               │
│  │  CLI Tool        │    │  ┌──────────────┴───────────┐   │
│  │  (clap)          │◄───┤  │  VS Code Extension       │   │
│  │                  │    │  │  (TypeScript + LSP)       │   │
│  │  vibeguard scan  │    │  │                          │   │
│  │  vibeguard guard │    │  │  Calls: vibeguard scan   │   │
│  │  vibeguard fix   │    │  │  --output json           │   │
│  │  vibeguard badge │    │  └──────────────────────────┘   │
│  └──────────────────┘    │                                  │
│                          │  ┌──────────────────────────┐   │
│  ┌──────────────────┐    │  │  Dashboard               │   │
│  │  Output          │    │  │  (Next.js 15 + React 19) │   │
│  │  Formatters      │    │  │                          │   │
│  │  (text, JSON,    │    │  │  Calls: REST API +       │   │
│  │   SARIF, badge)  │    │  │  vibeguard scan --json   │   │
│  └──────────────────┘    │  └──────────────────────────┘   │
├──────────────────────────┴──────────────────────────────────┤
│  INTEGRATION: TypeScript → spawns Rust CLI as subprocess     │
│  FUTURE: TypeScript → loads Rust WASM module directly        │
└─────────────────────────────────────────────────────────────┘
```

**Language Boundary Rule:**
- **Rust** = Everything related to scanning, parsing, detection rules, scoring, policies, CLI commands
- **TypeScript** = Everything related to AI integration (MCP), editor integration (VS Code), web UI (Dashboard)
- **Bridge** = TypeScript components call `vibeguard scan --output json` and parse the JSON output

---

## PART A: 🦀 RUST — Core Engine + CLI

---

### PHASE 1: RUST PROJECT SCAFFOLDING

#### Prompt 1.1 — Initialize Rust Workspace

```
Build the VibeGuard Rust project scaffolding at the current directory (VibeGuard/).

This is a Rust workspace with two crates: a core scanner library and a CLI binary.

Create this EXACT structure:

vibeguard/
├── Cargo.toml                    # Workspace root
├── .gitignore                    # Rust + Node.js ignores
├── README.md
├── .vibeguard.yml                # Default config file
├── crates/
│   ├── core/                     # Core scanner engine (LIBRARY)
│   │   ├── Cargo.toml
│   │   └── src/
│   │       ├── lib.rs            # Public API re-exports
│   │       ├── scanner.rs        # Main scan orchestrator
│   │       ├── parser.rs         # Language detection + file reading
│   │       ├── models.rs         # Core data models
│   │       ├── score.rs          # Safety score calculator
│   │       ├── policy.rs         # Policy engine (.vibeguard.yml)
│   │       ├── taint.rs          # Taint analysis (placeholder)
│   │       ├── sbom.rs           # SBOM generation (placeholder)
│   │       ├── rules/            # Detection rule modules
│   │       │   ├── mod.rs
│   │       │   ├── secret_detector.rs
│   │       │   ├── sql_injection.rs
│   │       │   ├── auth_checker.rs
│   │       │   ├── ai_threat_detector.rs
│   │       │   └── owasp.rs
│   │       └── output/           # Output formatters
│   │           ├── mod.rs
│   │           ├── text.rs       # Colored terminal output
│   │           ├── json.rs       # JSON output
│   │           ├── sarif.rs      # SARIF format
│   │           └── badge.rs      # SVG badge generator
│   └── cli/                      # CLI binary
│       ├── Cargo.toml
│       └── src/
│           └── main.rs           # clap-based CLI
├── config/
│   └── default_rules.yml         # Default security rules
├── tests/
│   └── fixtures/                 # Test files with vulnerabilities
│       ├── secret_py.py
│       ├── secret_js.js
│       ├── sqli_python.py
│       ├── sqli_js.js
│       ├── safe_code.js
│       ├── auth_missing.py
│       ├── ai_threats.py
│       └── ai_threats.js
└── .cargo/
    └── config.toml               # Build optimization
```

Dependencies for crates/core/Cargo.toml:
```toml
[dependencies]
tree-sitter = "0.22"
tree-sitter-javascript = "0.21"
tree-sitter-typescript = "0.21"
tree-sitter-python = "0.21"
rayon = "1.10"
regex = "1"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
serde_yaml = "0.9"
thiserror = "1"
glob = "0.3"
walkdir = "2"

[dev-dependencies]
tempfile = "3"
```

Dependencies for crates/cli/Cargo.toml:
```toml
[dependencies]
vibeguard-core = { path = "../core" }
clap = { version = "4", features = ["derive"] }
colored = "2"
indicatif = "0.17"
anyhow = "1"
serde_json = "1"
```

In crates/core/src/models.rs, define these types (ALL must derive Debug, Clone, Serialize, Deserialize):

```rust
use serde::{Serialize, Deserialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
    Info,
}

impl Severity {
    pub fn score_deduction(&self) -> i32 {
        match self {
            Severity::Critical => 15,
            Severity::High => 8,
            Severity::Medium => 4,
            Severity::Low => 1,
            Severity::Info => 0,
        }
    }

    pub fn emoji(&self) -> &str {
        match self {
            Severity::Critical => "🔴",
            Severity::High => "🟠",
            Severity::Medium => "🟡",
            Severity::Low => "🔵",
            Severity::Info => "⚪",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub id: String,
    pub rule_id: String,
    pub severity: Severity,
    pub file: PathBuf,
    pub line: u32,
    pub message: String,
    pub code_snippet: String,
    pub fix: Option<String>,
    pub suppressed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanResult {
    pub findings: Vec<Finding>,
    pub files_scanned: usize,
    pub scan_duration_ms: u64,
    pub score: Option<u32>,
    pub score_band: Option<String>,
    pub summary: ScanSummary,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanSummary {
    pub total_findings: usize,
    pub critical_count: usize,
    pub high_count: usize,
    pub medium_count: usize,
    pub low_count: usize,
    pub info_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanMetadata {
    pub engine_version: String,
    pub scan_mode: ScanMode,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ScanMode {
    Full,
    Diff,
    File,
}
```

In crates/core/src/scanner.rs, create:
```rust
pub struct Scanner {
    policy: PolicyEngine,
}

impl Scanner {
    pub fn new(config_path: Option<&Path>) -> Result<Self> { ... }
    pub fn scan_file(&self, path: &Path) -> Result<Vec<Finding>> { ... }
    pub fn scan_directory(&self, path: &Path) -> Result<ScanResult> { ... }
    pub fn scan_code(&self, code: &str, language: &str, filename: &str) -> Result<Vec<Finding>> { ... }
}
```

In crates/cli/src/main.rs, create clap derive with subcommands: scan, init, guard, fix, badge, dashboard.

Make sure `cargo check` passes.
```

#### Prompt 1.2 — Test Fixture Files

```
Create test fixture files in VibeGuard/tests/fixtures/ with realistic vulnerable code samples.

1. tests/fixtures/secret_py.py:
```python
# Line 2: HARDCODED AWS KEY — should trigger VG-SECRET-001
AWS_ACCESS_KEY = "AKIAIOSFODNN7EXAMPLE"

# Line 5: HARDCODED GITHUB TOKEN — should trigger VG-SECRET-002
GITHUB_TOKEN = "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefgh"

# Line 8: HARDCODED DB PASSWORD — should trigger VG-SECRET-003
DB_PASSWORD = "super_secret_123"

# Line 11: SAFE — should NOT trigger (normal variable)
app_name = "my-cool-app"

# Line 14: SAFE — should NOT trigger (comment about password, no actual password)
# Note: set the password in .env file, not here
```

2. tests/fixtures/secret_js.js:
```javascript
// Line 2: HARDCODED STRIPE KEY — should trigger VG-SECRET-004
const API_KEY = "sk_live_EXAMPLEEXAMPLEEXAMPLE";

// Line 5: HARDCODED JWT — should trigger VG-SECRET-005
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";

// Line 8: HARDCODED DB URL — should trigger VG-SECRET-006
const DB_URL = "postgres://admin:password123@localhost:5432/mydb";

// Line 11: SAFE — should NOT trigger (env var reference)
const safeKey = process.env.API_KEY;

// Line 14: SAFE — should NOT trigger (placeholder)
const placeholder = "REPLACE_ME";
```

3. tests/fixtures/sqli_python.py:
```python
# Line 2: SQL INJECTION — should trigger VG-SQLI-001 (f-string)
query = f"SELECT * FROM users WHERE id = {user_id}"

# Line 5: SQL INJECTION — should trigger VG-SQLI-002 (concatenation)
query2 = "SELECT * FROM users WHERE name = '" + name + "'"

# Line 8: SQL INJECTION — should trigger VG-SQLI-003 (.format)
query3 = "SELECT * FROM users WHERE id = {}".format(uid)

# Line 11: SAFE — should NOT trigger (parameterized)
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

4. tests/fixtures/sqli_js.js:
```javascript
// Line 2: SQL INJECTION — should trigger VG-SQLI-004 (template literal)
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Line 5: SQL INJECTION — should trigger VG-SQLI-005 (concatenation)
const query2 = "SELECT * FROM users WHERE name = '" + name + "'";

// Line 8: SAFE — should NOT trigger (parameterized $1)
pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

5. tests/fixtures/safe_code.js — Clean file with ZERO findings:
```javascript
// This file should produce ZERO security findings
const apiKey = process.env.API_KEY;
const query = 'SELECT * FROM users WHERE id = $1';
pool.query(query, [userId]);
try {
  await riskyOperation();
} catch (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

6. tests/fixtures/auth_missing.py:
```python
from flask import Flask
app = Flask(__name__)

# Line 5: MISSING AUTH — should trigger VG-AUTH-001
@app.route('/api/users', methods=['DELETE'])
def delete_user():
    return "deleted"

# Line 10: MISSING AUTH — should trigger VG-AUTH-002
@app.route('/api/admin/settings', methods=['PUT'])
def update_settings():
    return "updated"

# Line 15: SAFE — should NOT trigger (has auth)
@app.route('/api/profile')
@login_required
def get_profile():
    return "profile"
```

7. tests/fixtures/ai_threats.py:
```python
# Line 2: HALLUCINATED IMPORT — should trigger VG-AI-001
import nonsensical_ml_framework_abc123

# Line 5: SILENT EXCEPTION — should trigger VG-AI-002
try:
    risky_operation()
except:
    pass

# Line 10: EVAL ON USER INPUT — should trigger VG-AI-003
result = eval(request.form['code'])

# Line 13: OVERLY PERMISSIVE CORS — should trigger VG-AI-004
CORS(app, resources={r"*": {"origins": "*"}})

# Line 16: SAFE — should NOT trigger (proper error handling)
try:
    safe_operation()
except ValueError as e:
    logging.error(f"Error: {e}")
    raise
```

8. tests/fixtures/ai_threats.js:
```javascript
// Line 2: EVAL ON USER INPUT — should trigger VG-AI-005
eval(req.body.code);

// Line 5: SILENT CATCH — should trigger VG-AI-006
async function risky() {
  try {
    await fetchExternal();
  } catch(e) {}
}

// Line 10: NEW FUNCTION FROM INPUT — should trigger VG-AI-007
const fn = new Function(userInput);

// Line 13: SAFE — should NOT trigger
try {
  await safeOperation();
} catch (error) {
  console.error('Failed:', error);
  throw error;
}
```

Make sure all files have comments marking which lines SHOULD and SHOULD NOT trigger findings.
```

---

### PHASE 2: CORE SCANNER ENGINE (Rust)

#### Prompt 2.1 — Secret Detection Rules

```
Implement the secret detection module at crates/core/src/rules/secret_detector.rs.

Create a SecretDetector struct with compiled regex patterns:

Pattern list (all CRITICAL unless noted):
1. AWS Access Key: AKIA[0-9A-Z]{16}
2. AWS Secret Key: (?i)aws[_\-]?secret[_\-]?access[_\-]?key\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?
3. GitHub Token: ghp_[0-9a-zA-Z]{36}
4. GitHub Fine-Grained: github_pat_[0-9a-zA-Z]{82}
5. GitHub OAuth: gho_[0-9a-zA-Z]{36}
6. GitLab Token: glpat-[0-9a-zA-Z\-_]{20,}
7. Stripe Secret: sk_live_[0-9a-zA-Z]{24,}
8. Stripe Publishable: pk_live_[0-9a-zA-Z]{24,} (HIGH severity)
9. Generic API Key: (?i)(api[_\-]?key|apikey|api[_\-]?secret)\s*[:=]\s*['"]([A-Za-z0-9\-_]{20,})['"]
10. Generic Secret: (?i)(password|passwd|pwd|secret|token)\s*[:=]\s*['"]([^'"]{8,})['"]
11. Private Key: -----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----
12. JWT Token: eyJ[A-Za-z0-9\-_]+\.eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_.+/=]+
13. Database URL: (?i)(mysql|postgres|mongodb|redis)://[^:]+:([^@\s]{8,})@[^\s]+
14. Slack Webhook: https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+
15. Bearer Token: (?i)bearer\s+[A-Za-z0-9\-_.]{20,}

False positive filtering:
- Skip comment lines (// or # or /* */)
- Skip test file paths (.test., .spec., test_, _test.)
- Skip placeholder values: "REPLACE_ME", "your-key-here", "xxx", "TODO", "<placeholder>", "example"
- Skip all-same-character values

Method: detect(code: &str, filepath: &Path) -> Vec<Finding>

Write unit tests that verify each pattern against the fixture files.
Make sure `cargo test -p vibeguard-core` passes.
```

#### Prompt 2.2 — SQL Injection Detection

```
Implement SQL injection detection at crates/core/src/rules/sql_injection.rs.

Create SqlInjectionDetector with these patterns:

PYTHON:
- CRITICAL: f-string with SQL: f["']SELECT...FROM...{var}
- CRITICAL: %-formatting: "SELECT...%s" % var
- CRITICAL: .format(): "SELECT...{}".format(var)
- HIGH: Concatenation: "SELECT..." + var
- SAFE: cursor.execute("SELECT...%s", (var,)) — parameterized, do NOT flag

JAVASCRIPT/TYPESCRIPT:
- CRITICAL: Template literal: `SELECT...FROM...${var}`
- HIGH: Concatenation: "SELECT..." + var
- SAFE: pool.query('SELECT...WHERE id = $1', [var]) — parameterized, do NOT flag

Method: detect(code: &str, extension: &str) -> Vec<Finding>

Write tests using sqli_python.py and sqli_js.js fixtures.
Make sure `cargo test -p vibeguard-core` passes.
```

#### Prompt 2.3 — Auth Checker

```
Implement auth checking at crates/core/src/rules/auth_checker.rs.

Create AuthChecker that detects missing authentication:

PYTHON (Flask/Django):
- HIGH: DELETE/PUT/PATCH route without @login_required, @auth_required, @requires_auth
- MEDIUM: Route with "admin" in path without auth decorator
- SAFE: Route with @login_required — do NOT flag

JAVASCRIPT (Express/Next.js):
- HIGH: app.post/put/delete without auth middleware
- MEDIUM: Route with "/admin" path without auth
- SAFE: Route with isAuthenticated middleware — do NOT flag

GENERAL:
- HIGH: CORS with origin: "*" on sensitive routes

Method: detect(code: &str, extension: &str) -> Vec<Finding>

Write tests using auth_missing.py fixture.
Make sure `cargo test -p vibeguard-core` passes.
```

#### Prompt 2.4 — AI Threat Detector

```
Implement AI-specific threat detection at crates/core/src/rules/ai_threat_detector.rs.

Detection rules for AI-generated code mistakes:

- HIGH: Hallucinated import (package name >30 chars, contains underscores+numbers, not in known list)
- HIGH: Prompt injection (user input → LLM API without sanitization)
- HIGH: eval/exec on user input
- MEDIUM: Overly permissive CORS (wildcard origin)
- MEDIUM: Silent exception swallowing (except: pass, catch(e) {})
- MEDIUM: Resource exhaustion (while True/while(true) without break)
- LOW: Overly broad exception catching

Known safe packages list: requests, flask, express, react, lodash, axios, fastapi, django, sqlalchemy, etc. (~100 entries)

Method: detect(code: &str, extension: &str) -> Vec<Finding>

Write tests using ai_threats.py and ai_threats.js fixtures.
Make sure `cargo test -p vibeguard-core` passes.
```

---

### PHASE 3: SCORING, POLICY & SCANNER WIRING (Rust)

#### Prompt 3.1 — Safety Score Calculator

```
Implement the score calculator at crates/core/src/score.rs.

Logic:
- Starting score: 100
- Deductions: Critical=-15, High=-8, Medium=-4, Low=-1, Info=0
- Floor: 0, Ceiling: 100

ScoreBand enum:
- Excellent: 90-100 (🟢)
- Good: 70-89 (🟡)
- NeedsWork: 50-69 (🟠)
- Poor: 25-49 (🔴)
- Critical: 0-24 (⚫)

Methods:
- calculate(findings: &[Finding]) -> (u32, ScoreBand)
- format_report(score, band, summary, files_scanned, duration_ms) -> String

The format_report should produce this exact output format:
┌─────────────────────────────────┐
│   VIBE CODE SAFETY SCORE       │
│        🟢 92/100               │
│        Excellent               │
├─────────────────────────────────┤
│  Files scanned:  47            │
│  Findings:       3             │
│  ├─ Critical:    0             │
│  ├─ High:        1             │
│  ├─ Medium:      2             │
│  └─ Low:         0             │
│  Scan time:      1.2s          │
└─────────────────────────────────┘

Write unit tests for all score bands.
Make sure `cargo test -p vibeguard-core` passes.
```

#### Prompt 3.2 — Policy Engine

```
Implement the policy engine at crates/core/src/policy.rs.

Config file format (.vibeguard.yml):
```yaml
version: "1.0"
rules:
  VG-SECRET-001:
    enabled: true
    severity: critical
  VG-AI-003:
    enabled: false
exceptions:
  - path: "tests/**"
    rules: ["VG-SECRET-*"]
    reason: "Test fixtures"
severity_overrides:
  VG-SECRET-003: medium
scan:
  exclude_paths: ["node_modules", ".git", "target", "dist", "__pycache__"]
  max_file_size_kb: 500
  languages: [javascript, typescript, python, go, java]
output:
  format: text
  color: auto
```

PolicyEngine struct with methods:
- load(config_path: &Path) -> Result<Self>
- default() -> Self
- is_rule_enabled(rule_id: &str) -> bool
- get_severity_override(rule_id: &str) -> Option<Severity>
- should_exclude_file(path: &Path) -> bool
- is_suppressed(finding: &Finding) -> bool

Wildcard matching: "VG-SECRET-*" matches VG-SECRET-001, VG-SECRET-002, etc.

Create a default .vibeguard.yml in the project root.

Write unit tests.
Make sure `cargo test -p vibeguard-core` passes.
```

#### Prompt 3.3 — Wire Up Scanner + CLI Integration

```
Wire up the main Scanner in crates/core/src/scanner.rs to use ALL detection modules.

Scanner struct should hold:
- SecretDetector
- SqlInjectionDetector
- AuthChecker
- AiThreatDetector
- PolicyEngine

scan_file(path) → reads file, detects language, runs ALL detectors, applies policy filtering
scan_directory(path) → walks tree with rayon parallel iterator, returns ScanResult with score
scan_code(code, language, filename) → scans code string without filesystem access

Update the CLI main.rs scan command:
1. Initialize Scanner
2. Call scan_directory
3. Display results using text formatter (colored output with progress bar)
4. Show score report

The CLI scan command should support:
- `vibeguard scan [path]` — scan directory
- `--output text|json|sarif` — output format
- `--severity critical|high|medium|low|info` — min severity filter
- `--no-color` — disable colors
- `--config <path>` — custom config

Make sure `cargo build` produces a working binary AND `cargo test` passes.
Test: cargo run -- scan tests/fixtures/
```

---

### PHASE 4: CLI COMPLETE (Rust)

#### Prompt 4.1 — Full CLI with All Commands

```
Complete the VibeGuard CLI at crates/cli/src/main.rs with ALL commands:

1. `vibeguard scan [path]` — Full scan
   - --output: text (default), json, sarif, pr-comment
   - --severity: min severity filter
   - --fix: show fix suggestions inline
   - --config: custom .vibeguard.yml path

2. `vibeguard init` — Initialize project
   - Create .vibeguard.yml with defaults
   - Detect project language from file extensions

3. `vibeguard guard` — Pre-commit hook mode
   - Scan staged files (git diff --cached --name-only --diff-filter=ACM)
   - Exit 1 if CRITICAL found, exit 0 if clean
   - --install: install git hook
   - --uninstall: remove git hook

4. `vibeguard fix` — Auto-remediation
   - --dry-run: show what would change
   - --yes: auto-approve

5. `vibeguard badge` — Generate README badge
   - Output SVG badge with score
   - --format: svg, markdown, html

6. `vibeguard dashboard` — Open web dashboard (placeholder: prints "Coming in v0.2")

Output Formatters (in crates/core/src/output/):

text.rs — Beautiful colored terminal output:
- Progress bar during scan
- Findings grouped by file
- Severity badges: 🔴 CRITICAL (red bg), 🟠 HIGH (orange), 🟡 MEDIUM (yellow), 🔵 LOW (blue)
- Score report at end

json.rs — Valid JSON matching ScanResult struct, pretty-printed

sarif.rs — SARIF 2.1.0 format:
- severity→level: critical→error, high→error, medium→warning, low→note, info→none
- Rule metadata in runs[].tool.driver.rules[]
- Results with location formatting

pr_comment.rs — Markdown table for GitHub PR comments:
## 🛡️ VibeGuard Security Scan
**Score: 🟢 92/100** | Files: 47 | Findings: 3
| Severity | File | Line | Rule | Message |

badge.rs — SVG badge generator:
- shields.io style
- Color based on score band
- Format: <svg> with score in center

Pre-commit hook script (config/pre-commit.sh):
```bash
#!/bin/sh
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)
vibeguard guard $STAGED_FILES
exit $?
```

Make sure `cargo build --release` works and `cargo test` passes.
```

#### Prompt 4.2 — Guard Command Details

```
Implement the complete pre-commit hook in the VibeGuard CLI:

vibeguard guard --install:
- Create .git/hooks/pre-commit
- chmod +x
- Script gets staged files, runs vibeguard scan on each
- If CRITICAL: print findings, exit 1
- If clean: exit 0
- Backup existing hook if present

vibeguard guard --uninstall:
- Remove .git/hooks/pre-commit, restore backup

vibeguard guard [files...]:
- Scan provided files directly
- Exit 1 for critical, 0 for clean

vibeguard guard --fix:
- Apply safe auto-fixes before checking
- Re-add fixed files to staging

Output format:
🔍 VibeGuard — Checking staged files...
Scanning: src/db.ts, src/auth.py

🔴 CRITICAL: src/db.ts:12 — Hardcoded database password
   Rule: VG-SECRET-001
   Fix: Move to environment variable

❌ Commit blocked: 1 critical issue found
   Run 'vibeguard scan src/db.ts' for details
   Run 'vibeguard fix' to auto-fix

Make sure `cargo build` and `cargo test` pass.
```

---

### PHASE 5: GITHUB ACTIONS (Rust outputs + YAML)

#### Prompt 5.1 — GitHub Action + SARIF

```
Create the GitHub Actions integration for VibeGuard.

Create action.yml at the project root:
```yaml
name: 'VibeGuard Security Scan'
description: 'Scan AI-generated code for security vulnerabilities'
branding:
  icon: 'shield'
  color: 'green'
inputs:
  fail-on:
    description: 'Minimum severity to fail CI'
    required: false
    default: 'critical'
  output:
    description: 'Output formats (comma-separated)'
    required: false
    default: 'sarif,pr-comment'
runs:
  using: 'composite'
  steps:
    - name: Install VibeGuard
      shell: bash
      run: cargo install vibeguard --locked
    - name: Run Scan
      shell: bash
      id: scan
      run: |
        vibeguard scan --output json > vibeguard-results.json
        vibeguard scan --output sarif > vibeguard-results.sarif
        SCORE=$(cat vibeguard-results.json | jq '.score')
        echo "score=$SCORE" >> $GITHUB_OUTPUT
    - name: Upload SARIF
      if: contains(inputs.output, 'sarif')
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: vibeguard-results.sarif
    - name: Fail on severity
      if: inputs.fail-on != 'none'
      shell: bash
      run: vibeguard guard --severity ${{ inputs.fail-on }}
```

Create example workflow at .github/workflows/vibeguard.yml:
```yaml
name: VibeGuard Security
on: [push, pull_request]
permissions:
  contents: read
  security-events: write
  pull-requests: write
jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: vibeguard/scan-action@v1
        with:
          fail-on: critical
          output: sarif,pr-comment
```

Make sure `cargo build` and `cargo test` pass.
```

---

## PART B: 📘 TYPESCRIPT — MCP Server + VS Code Extension + Dashboard

---

### PHASE 6: MCP SERVER (TypeScript)

#### Prompt 6.1 — MCP Server for AI Assistants

```
Build the VibeGuard MCP Server in TypeScript at vibeguard-mcp/.

This server enables AI coding assistants (Claude Code, Cursor, Windsurf) to scan code in real-time.
It calls the Rust CLI as a subprocess and parses JSON output.

Create this structure:

vibeguard-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts              # MCP server entry point
│   ├── tools/
│   │   ├── scan.ts           # vibeguard_scan tool
│   │   ├── scan-diff.ts      # vibeguard_scan_diff tool
│   │   └── get-fix.ts        # vibeguard_get_fix tool
│   ├── scanner-bridge.ts     # Spawns Rust CLI subprocess
│   └── types.ts              # Shared TypeScript types
└── .gitignore
```

package.json:
```json
{
  "name": "@anthropic-ai/vibeguard-mcp",
  "version": "0.1.0",
  "description": "VibeGuard MCP server for AI coding assistants",
  "main": "dist/index.js",
  "bin": { "vibeguard-mcp": "./dist/index.js" },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "latest"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "tsx": "^4.7",
    "@types/node": "^20"
  }
}
```

scanner-bridge.ts — Bridge to Rust CLI:
```typescript
import { spawn } from 'child_process';
import { ScanResult } from './types';

export async function scanFiles(files: string[]): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    const args = ['scan', '--output', 'json', ...files];
    const child = spawn('vibeguard', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    
    let stdout = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { console.error(data.toString()); });
    
    child.on('close', (code) => {
      if (code === 0 || code === 1) { // 1 = findings found, still valid JSON
        resolve(JSON.parse(stdout));
      } else {
        reject(new Error(`vibeguard exited with code ${code}`));
      }
    });
    
    child.on('error', reject);
  });
}

export async function scanDiff(diff: string): Promise<ScanResult> {
  // Pipe diff via stdin to vibeguard
  return new Promise((resolve, reject) => {
    const child = spawn('vibeguard', ['scan', '--output', 'json', '--diff'], { stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdin.write(diff);
    child.stdin.end();
    
    let stdout = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.on('close', (code) => {
      resolve(JSON.parse(stdout));
    });
    child.on('error', reject);
  });
}
```

MCP Tools to register:

1. vibeguard_scan
   - Input: { files: string[] }
   - Calls scanner-bridge.scanFiles()
   - Returns: { findings, score, summary }

2. vibeguard_scan_diff
   - Input: { diff: string }
   - Calls scanner-bridge.scanDiff()
   - Returns: { findings, score, summary }

3. vibeguard_get_fix
   - Input: { finding_id: string, file_path: string, code_snippet: string }
   - Returns: { patch: string, explanation: string, confidence: number }

index.ts — MCP Server entry:
```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'vibeguard',
  version: '0.1.0',
}, {
  capabilities: { tools: {} }
});

// Register tools, handle requests...
// Log to stderr, not stdout
```

README.md with:
- Install: npm install -g @anthropic-ai/vibeguard-mcp
- Claude Code config:
```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "vibeguard-mcp",
      "args": []
    }
  }
}
```
- Cursor config (similar)

Make sure `npx tsc --noEmit` passes.
```

---

### PHASE 7: VS CODE EXTENSION (TypeScript)

#### Prompt 7.1 — VS Code Extension

```
Build the VibeGuard VS Code Extension at vscode-extension/.

This provides inline security diagnostics as developers code.
It calls the Rust CLI as a subprocess for scanning.

Create this structure:

vscode-extension/
├── package.json            # Extension manifest
├── tsconfig.json
├── README.md
├── .vscodeignore
├── src/
│   ├── extension.ts        # Entry point
│   ├── client/
│   │   └── index.ts        # LSP client
│   └── server/
│       ├── index.ts        # Language server
│       ├── scanner.ts      # Calls vibeguard CLI
│       └── diagnostics.ts  # Maps findings → VS Code diagnostics
└── syntaxes/
    └── vibeguard.tmLanguage
```

scanner.ts — Bridge to Rust CLI:
```typescript
import { spawn } from 'child_process';
import { Finding } from './types';

export async function scanFile(filePath: string): Promise<Finding[]> {
  return new Promise((resolve, reject) => {
    const child = spawn('vibeguard', ['scan', filePath, '--output', 'json'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.on('close', () => {
      const result = JSON.parse(stdout);
      resolve(result.findings);
    });
    child.on('error', reject);
  });
}
```

extension.ts:
- Activate on: ["javascript", "typescript", "python", "go", "java"]
- Show "VibeGuard: Active" in status bar
- Register commands: Scan Current File, Scan Workspace, Show Score

diagnostics.ts:
- Map Finding → VS Code Diagnostic
- Critical → Error (red squiggly)
- High → Warning (yellow)
- Medium → Information (blue)
- Low → Hint (gray)

Status bar:
- 🟢/🟡/🔴/⚫ based on current file's score
- Click to show full results

Code Actions (Quick Fixes):
- "Suppress this finding" — adds inline comment
- "Fix: Move to .env" — for secrets
- "Fix: Use parameterized query" — for SQL injection

package.json contributes:
- Activation events for supported languages
- All commands
- Keybindings: Cmd+Shift+S for scan

Make sure TypeScript compiles.
```

---

### PHASE 8: DASHBOARD (TypeScript — Next.js)

#### Prompt 8.1 — Dashboard Setup

```
Build the VibeGuard Dashboard at dashboard/ using Next.js 15, React 19, and Tailwind CSS.

This is a web UI for viewing scan results, security posture, and compliance reports.
It calls the Rust CLI for scanning and displays results.

Initialize with: npx create-next-app@latest dashboard --typescript --tailwind --app --src-dir

Structure:
dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Dark theme root layout
│   │   ├── page.tsx            # Overview with ScoreCard
│   │   ├── globals.css
│   │   ├── scan/page.tsx       # Scan results detail
│   │   ├── history/page.tsx    # Scan history
│   │   ├── policies/page.tsx   # Policy management
│   │   └── api/
│   │       ├── scan/route.ts   # POST /api/scan
│   │       ├── findings/route.ts
│   │       └── score/route.ts
│   ├── components/
│   │   ├── layout/ (Sidebar, Header, Footer)
│   │   ├── dashboard/
│   │   │   ├── ScoreCard.tsx      # SVG circular gauge
│   │   │   ├── FindingsChart.tsx  # Bar chart by severity
│   │   │   ├── TrendChart.tsx     # Score over time
│   │   │   ├── RecentScans.tsx    # Latest scans table
│   │   │   └── TopIssues.tsx      # Common findings
│   │   ├── findings/
│   │   │   ├── FindingCard.tsx
│   │   │   ├── FindingList.tsx
│   │   │   └── CodeViewer.tsx
│   │   └── ui/ (Button, Badge, Card, Modal, Spinner)
│   ├── lib/
│   │   ├── api.ts              # API client
│   │   ├── types.ts            # TypeScript types
│   │   └── scanner.ts          # Calls vibeguard CLI
│   └── hooks/
│       └── useScan.ts
├── tailwind.config.ts
└── next.config.ts

scanner.ts — Bridge to Rust CLI:
```typescript
import { execSync } from 'child_process';

export function scanPath(path: string): ScanResult {
  const output = execSync(`vibeguard scan ${path} --output json`, { encoding: 'utf-8' });
  return JSON.parse(output);
}
```

Design System (dark theme):
- Background: #0a0a0f
- Cards: #1a1a2e, border: #2a2a3e
- Accent: #00e676 (green)
- Text: #e8e8f0 primary, #8888a0 secondary
- Severity: Critical=#ff5252, High=#ff9100, Medium=#b388ff, Low=#448aff

Landing page:
- Big ScoreCard with SVG circular gauge (animated)
- FindingsChart: horizontal bar chart
- TrendChart: line chart (Recharts)
- RecentScans: table
- TopIssues: list

Make sure `npm run build` passes with no errors.
```

---

## PART C: 🧪 TESTING & RELEASE

---

### PHASE 9: INTEGRATION TESTING

#### Prompt 9.1 — End-to-End Tests

```
Write end-to-end tests for VibeGuard:

Rust tests (tests/integration/):
1. scanner_e2e.rs — Scan each fixture, verify exact findings
2. cli_e2e.rs — Run CLI via Command::new, verify JSON output
3. policy_e2e.rs — Test rule disabling, exceptions, overrides
4. guard_e2e.rs — Test pre-commit hook install/uninstall/block

Comprehensive fixture at tests/fixtures/full_project/:
- src/db.ts (SQLi + secret)
- src/routes.ts (missing auth)
- src/utils.ts (clean)
- .vibeguard.yml
- EXPECTED.json (expected results)

Benchmarks (tests/bench/):
- criterion benchmarks for single file, 100 files, 1000 files

CI test script:
```bash
#!/bin/bash
set -e
cargo fmt -- --check
cargo clippy -- -D warnings
cargo test
cargo build --release
```

Run: cargo test && cargo clippy -- -D warnings
```

---

### PHASE 10: DOCUMENTATION

#### Prompt 10.1 — README + Docs

```
Create documentation for VibeGuard:

1. Root README.md:
   - Project name + tagline: "Ship AI code fast — without shipping vulnerabilities"
   - Feature list
   - Quick start: install → init → scan
   - CLI reference
   - Configuration reference
   - Integration guides (GitHub Actions, pre-commit, VS Code, MCP)
   - Architecture diagram
   - License (MIT)

2. docs/ directory:
   - architecture.md — Hybrid Rust+TypeScript architecture
   - rules.md — All security rules with examples
   - mcp-setup.md — MCP server setup for Claude Code, Cursor
   - vscode-setup.md — VS Code extension guide
   - github-actions.md — CI/CD integration
   - policies.md — Policy configuration
   - contributing.md — How to add rules

3. CHANGELOG.md with v0.1.0 notes

4. Update Cargo.toml:
```toml
[package]
name = "vibeguard"
version = "0.1.0"
description = "Security guardrails for AI-generated code"
license = "MIT"
repository = "https://github.com/mohitbaghel/vibeguard"
keywords = ["security", "ai", "code-scanning", "vibe-coding"]
```
```

---

### PHASE 11: RELEASE PREPARATION

#### Prompt 11.1 — Release Build & Packaging

```
Prepare VibeGuard v0.1.0 for release:

1. GitHub Release workflow (.github/workflows/release.yml):
   - Trigger on tag push (v*)
   - Build for: macOS (arm64, x64), Linux (x64, arm64), Windows (x64)
   - Use cross-compilation
   - Upload binaries as release assets

2. Release build script:
```bash
#!/bin/bash
cargo build --release
strip target/release/vibeguard 2>/dev/null || true
ls -lh target/release/vibeguard
```

3. Install script:
```bash
#!/bin/bash
# curl -sSL https://get.vibeguard.dev | sh
```

4. Dockerfile:
```dockerfile
FROM rust:1.77-slim as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
COPY --from=builder /app/target/release/vibeguard /usr/local/bin/
ENTRYPOINT ["vibeguard"]
```

5. Makefile:
```makefile
build:
    cargo build --release
test:
    cargo test
    cd vibeguard-mcp && npm test
    cd vscode-extension && npm test
    cd dashboard && npm run build
release:
    cargo build --release --target $(shell rustc -vV | grep host | awk '{print $$2}')
install:
    cargo install --path crates/cli
```

6. Final verification:
```bash
cargo fmt -- --check
cargo clippy -- -D warnings
cargo test
cargo build --release
cd vibeguard-mcp && npx tsc --noEmit
cd dashboard && npm run build
```
```

---

## 📋 HOW TO USE THESE PROMPTS

### Build Order:
```
PART A (Rust Core + CLI):
  Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
  
PART B (TypeScript Layer):
  Phase 6 → Phase 7 → Phase 8
  
PART C (Testing & Release):
  Phase 9 → Phase 10 → Phase 11
```

### Checkpoints After Each Phase:
```bash
# After Rust phases (1-5):
cargo check && cargo test -p vibeguard-core && cargo build

# After TypeScript phases (6-8):
cd vibeguard-mcp && npx tsc --noEmit
cd dashboard && npm run build

# After all phases:
cargo fmt -- --check && cargo clippy -- -D warnings && cargo test
```

### If You Get Stuck:
- "Fix this error: [paste error]"
- "Rewrite [module] to fix [issue]"
- "According to the TRD, [description]"
