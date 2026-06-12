# VibeGuard — Build Prompts (Copy-Paste Ready)

> Use these prompts with Claude Code, Cursor Composer, GitHub Copilot, or any AI coding agent.
> **Recommended workflow:** Paste one prompt at a time. Review the output. Then run the next prompt.
> **Tech Stack:** TypeScript/Node.js (CLI + GitHub Action) — fastest path to MVP.

---

## 🕐 Before You Start

```bash
# Create your project directory
mkdir ~/Desktop/vibeguard/vibeguard-cli
cd ~/Desktop/vibeguard/vibeguard-cli
git init

# Initialize Node.js with TypeScript
npm init -y
npm install typescript tsx @types/node commander chalk globby ora yaml zod
npm install -D vitest @vitest/coverage-v8 tsup eslint @typescript-eslint/* prettier husky

# Setup TypeScript
echo '{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}' > tsconfig.json

# Setup package.json for CLI
echo '{
  "name": "vibeguard",
  "version": "0.1.0",
  "description": "Security scanner for AI-generated code",
  "type": "module",
  "main": "./dist/index.js",
  "bin": { "vibeguard": "./dist/index.js" },
  "scripts": {
    "dev": "tsup --watch",
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "engines": { "node": ">=18.0.0" },
  "keywords": ["security", "ai", "static-analysis", "cli"],
  "author": "Mohit Baghel",
  "license": "MIT"
}' > package.json
```

```bash
# Setup tsup
echo 'import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/cli/index.ts"],
  outDir: "dist",
  target: "es2022",
  platform: "node",
  format: ["esm"],
  bundle: true,
  splitting: false,
  sourcemap: true,
  minify: true,
  shims: true,
  clean: true,
  banner: { js: "#!/usr/bin/env node" },
});' > tsup.config.ts

# Setup vitest
echo 'import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { coverage: { provider: "v8" } }
});' > vitest.config.ts
```

---

## Prompt 1: Foundation — Types & Data Models

**GOAL:** Create all TypeScript interfaces, enums, and type aliases that the entire project depends on.

**CREATE FILE:** `src/types/index.ts`

Requirements:

1. **Severity enum** with values: `LOW = 'low'`, `MEDIUM = 'medium'`, `HIGH = 'high'`, `CRITICAL = 'critical'`

2. **Severity weights mapping:** `LOW: 1`, `MEDIUM: 4`, `HIGH: 8`, `CRITICAL: 15`

3. **ScoreRating type:** `'excellent' | 'good' | 'needs-work' | 'poor' | 'critical'`

4. **SCORE_RANGES constant:**
   - excellent: [90, 100]
   - good: [70, 89]
   - needs-work: [50, 69]
   - poor: [25, 49]
   - critical: [0, 24]

5. **Issue interface** with these exact fields:
   - `id: string` — unique: `${detectorId}:${hash(filePath,line,column)}`
   - `detectorId: string`
   - `title: string`
   - `description: string`
   - `severity: Severity`
   - `filePath: string` (relative to scan root)
   - `line: number` (1-indexed)
   - `column: number` (1-indexed)
   - `length: number`
   - `match: string` (the matched content, will be redacted for secrets)
   - `lineContent: string` (full line)
   - `confidence: number` (0-1)
   - `fix?: string` (optional suggested fix)
   - `docsUrl?: string`
   - `cwe?: string`

6. **CategoryScore interface:**
   - `name: string`
   - `score: number` (0-100)
   - `issueCount: number`
   - `maxSeverity: Severity | null`

7. **ScanResult interface:**
   - `timestamp: string` (ISO 8601)
   - `version: string`
   - `filesScanned: number`
   - `filesSkipped: number`
   - `linesScanned: number`
   - `durationMs: number`
   - `issues: Issue[]`
   - `issuesBySeverity: Record<Severity, Issue[]>`
   - `issuesByDetector: Record<string, Issue[]>`
   - `categoryScores: Record<string, CategoryScore>`
   - `overallScore: number`
   - `rating: ScoreRating`
   - `passed: boolean`

8. **VibeGuardConfig interface:**
   - `minSeverity: Severity`
   - `scoreThreshold: number` (0-100)
   - `ignore: string[]`
   - `extensions: string[]`
   - `maxFileSize: number` (bytes)
   - `detectors: Record<string, boolean>`
   - `outputFormat: 'text' | 'json' | 'sarif'`
   - `showBadge: boolean`

9. **SecretPattern interface** (for detector use):
   - `id: string`
   - `name: string`
   - `regex: RegExp`
   - `severity: Severity`
   - `entropyThreshold?: number`
   - `falsePositiveFilters: FalsePositiveFilter[]`

10. **FalsePositiveFilter interface:**
    - `name: string`
    - `test: (match: string, line: string, filePath: string) => boolean`

11. Type guard functions:
    - `isValidSeverity(value: unknown): value is Severity`
    - `isValidScoreRating(value: unknown): value is ScoreRating`
    - `isIssue(value: unknown): value is Issue`

**TEST CRITERIA:** Run `npx tsc --noEmit` — should compile with zero errors. All types must be properly exported.

**EXPECTED LINES:** ~120-150 lines of TypeScript.

---

## Prompt 2: File Discovery Engine

**GOAL:** Build the file scanner that walks directories and finds files to analyze.

**CREATE FILE:** `src/utils/files.ts`

Requirements:

1. Function `discoverFiles(rootPath: string, config: VibeGuardConfig): Promise<string[]>`
   - Resolve rootPath to absolute path
   - Read `.gitignore` if it exists at the root (parse each non-comment line)
   - Combine `.gitignore` patterns with `config.ignore`
   - Use `globby` to find all files matching `config.extensions`
   - Respect ignore patterns
   - Filter out binary files (check for null bytes in first 8KB)
   - Filter out files larger than `config.maxFileSize`
   - Skip files with any line > 2000 chars (likely minified)
   - Skip files with > 10000 lines (likely generated)
   - Return paths relative to `rootPath`

2. Function `readFileContent(filePath: string): Promise<string | null>`
   - Read file as buffer
   - Check first 8KB for null bytes → if found, return null (binary)
   - Decode as UTF-8
   - Check max line length (2000) → if any line exceeds, return null
   - Check max line count (10000) → if exceeds, return null
   - Return content as string

3. Helper function `isBinary(buffer: Buffer): boolean`
   - Returns true if buffer contains null byte (0x00)

4. Helper function `sanitizeFilePath(userPath: string, rootPath: string): string`
   - Resolve path
   - Check for path traversal (path must remain within rootPath)
   - Throw `SecurityError` if traversal detected

5. Custom error class `SecurityError extends Error`

**CREATE FILE:** `tests/utils/files.test.ts`

Create tests:
- Test file discovery with mock directory structure
- Test binary file detection
- Test path sanitization (should block `../../../etc/passwd`)
- Test large file skipping
- Test `.gitignore` parsing

**TEST CRITERIA:** Run `npm test` — all tests must pass.

---

## Prompt 3: Configuration System

**GOAL:** Build the config loader that reads `.vibeguard.yaml` and validates it.

**CREATE FILE:** `src/utils/config.ts`

Requirements:

1. Use `zod` for schema validation

2. Schema spec:
   ```typescript
   const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);
   const configSchema = z.object({
     minSeverity: severitySchema.default('low'),
     scoreThreshold: z.number().min(0).max(100).default(50),
     ignore: z.array(z.string()).default([
       '**/node_modules/**', '**/.git/**', '**/dist/**',
       '**/build/**', '**/.next/**', '**/*.min.js'
     ]),
     extensions: z.array(z.string()).default([
       '.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yaml', '.yml', '.env'
     ]),
     maxFileSize: z.number().default(1048576), // 1MB
     detectors: z.record(z.boolean()).default({
       secrets: true, sql: true, auth: true, files: true
     }),
     outputFormat: z.enum(['text', 'json', 'sarif']).default('text'),
     showBadge: z.boolean().default(true),
   });
   ```

3. Function `loadConfig(cliOverrides?: Partial<VibeGuardConfig>, configPath?: string): Promise<VibeGuardConfig>`
   - Start with defaults
   - If `configPath` or `.vibeguard.yaml` exists, parse and merge
   - Apply environment variables:
     - `VIBEGUARD_MIN_SEVERITY` → minSeverity
     - `VIBEGUARD_SCORE_THRESHOLD` → scoreThreshold
     - `VIBEGUARD_OUTPUT_FORMAT` → outputFormat
     - `VIBEGUARD_MAX_FILE_SIZE` → maxFileSize
   - Apply CLI overrides (highest priority)
   - Validate with Zod
   - On validation error, throw `ConfigError` with human-readable message

4. Function `initConfig(rootPath: string): Promise<void>`
   - Creates `.vibeguard.yaml` with sensible defaults

5. Custom error class `ConfigError extends Error`

6. Helper function `parseEnvConfig(): Partial<VibeGuardConfig>`

**CREATE FILE:** `.vibeguard.yaml.example`
```yaml
minSeverity: low
scoreThreshold: 50
ignore:
  - "**/node_modules/**"
  - "**/.git/**"
  - "**/dist/**"
  - "**/build/**"
  - "**/*.min.js"
  - "**/coverage/**"
extensions:
  - ".js"
  - ".ts"
  - ".jsx"
  - ".tsx"
  - ".py"
  - ".json"
  - ".yaml"
  - ".yml"
  - ".env"
maxFileSize: 1048576
detectors:
  secrets: true
  sql: true
  auth: true
  files: true
outputFormat: text
showBadge: true
```

**CREATE FILE:** `tests/utils/config.test.ts`
Tests for:
- Default config loaded correctly
- YAML file parsed correctly
- Environment variables respected
- CLI overrides have highest priority
- Invalid YAML throws ConfigError with readable message
- Zod validation catches bad values (e.g., scoreThreshold = 150)

**TEST CRITERIA:** `npm test` passes. `npx tsc --noEmit` has no errors.

---

## Prompt 4: Secret Detector (Core Engine Part 1)

**GOAL:** Build the secret pattern matcher that finds API keys, tokens, and passwords.

**CREATE FILE:** `src/core/detectors/secrets.ts`

Requirements:

1. Create a `SecretDetector` class implementing:
   ```typescript
   interface Detector {
     readonly id: string;
     readonly name: string;
     readonly supportedExtensions: string[];
     detect(filePath: string, content: string): Issue[];
   }
   ```

2. Pattern database — create these patterns:
   | ID | Regex | Severity |
   |----|-------|----------|
   | `aws-access-key` | `/AKIA[0-9A-Z]{16}/` | CRITICAL |
   | `aws-secret-key` | `/(?i)aws_secret_access_key.*['"][0-9a-zA-Z/+]{40}['"]/` | CRITICAL |
   | `github-token` | `/ghp_[0-9a-zA-Z]{36}/` | CRITICAL |
   | `github-pat` | `/github_pat_[0-9a-zA-Z_]{22,}/` | CRITICAL |
   | `stripe-live-key` | `/sk_live_[0-9a-zA-Z]{24}/` | CRITICAL |
   | `generic-api-key` | `/(?i)(api[_-]?key|apikey|api_secret)\s*[:=]\s*["']([^"']{20,})["']/g` | HIGH |
   | `bearer-token` | `/(?i)bearer\s+[0-9a-zA-Z\-._~+/]+=*/` | HIGH |
   | `jwt-token` | `/eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_+/]+=*/` | HIGH |
   | `private-key` | `/-----BEGIN (RSA\|DSA\|EC\|OPENSSH\|PGP) PRIVATE KEY-----/` | CRITICAL |
   | `slack-token` | `/xox[baprs]-[0-9a-zA-Z-]+/` | HIGH |
   | `discord-token` | `/[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/` | HIGH |
   | `db-password` | `/(?i)(password|passwd|pwd)\s*[:=]\s*["']([^"']{8,})["']/g` | HIGH |

3. False positive filtering — skip if:
   - Line starts with comment (`//`, `#`, `*`, `<!--`)
   - File is a test file (path contains `.test.`, `.spec.`, `__tests__`)
   - Match contains placeholders: `your-`, `YOUR_`, `placeholder`, `example`, `test`, `dummy`, `fake`, `changeme`, `insert-here`
   - Match is inside a string that's just an error message (contains `throw new Error`, `console.`)

4. For `generic-api-key`: calculate Shannon entropy. If entropy < 3.0, skip it:
   ```typescript
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
   ```

5. Generate Issue objects with:
   - Unique ID: `secrets:${hash(filepath + line + column)}`
   - Title: pattern name (e.g., "AWS Access Key ID detected")
   - Description: brief explanation with fix suggestion (e.g., "Move to environment variable using `.env` file")
   - Severity from pattern
   - File path, line, column (from regex match index)
   - Match content (redacted for display — first 4 chars + `***` + last 4 chars)
   - Full line content
   - Confidence: 0.95 for exact patterns, proportional to entropy for generic patterns
   - CWE: map appropriate CWE (e.g., CWE-798 for hardcoded credentials)

**CREATE FILE:** `tests/core/detectors/secrets.test.ts`

Create test fixtures in `tests/fixtures/secrets/`:
- `aws-keys.js` — contains real-looking AWS key pattern
- `github-tokens.ts` — contains GitHub token
- `false-positives.js` — contains placeholder values that should NOT trigger
- `test-file.spec.js` — test file with fake keys (should NOT trigger)

Write tests that verify:
- Each pattern type is detected
- False positives are correctly filtered
- Test files are skipped
- Redaction works properly
- Confidence scores vary correctly

**TEST CRITERIA:** `npm test` passes with >90% code coverage for this file.

---

## Prompt 5: SQL Injection Detector (Core Engine Part 2)

**GOAL:** Build the SQL injection detector for JavaScript/TypeScript and Python.

**CREATE FILE:** `src/core/detectors/sql.ts`

Requirements:

1. Create `SQLInjectionDetector` class implementing `Detector` interface

2. Supported extensions: `.js`, `.ts`, `.jsx`, `.tsx`, `.py`

3. Detection patterns:
   | ID | Pattern | Severity | Description |
   |----|---------|----------|-------------|
   | `js-sql-template-literal` | Template literal with SQL + `${var}` | CRITICAL | `` `SELECT * FROM ${table}` `` |
   | `js-sql-string-concat` | String concat with SQL + `+` | HIGH | `"SELECT * FROM " + table` |
   | `py-sql-fstring` | Python f-string with SQL | CRITICAL | `f"SELECT * FROM {table}"` |
   | `py-sql-format` | `.format()` on SQL string | CRITICAL | `"SELECT * FROM {}".format(table)` |
   | `js-unparameterized-execute` | `.execute(query)` or `.query(query)` without params | HIGH | `db.execute(userQuery)` |
   | `js-sql-interpolation` | `${var}` in query string for databases | CRITICAL | `query \`INSERT INTO \${table}\`` |

4. SQL keywords to detect in surrounding context: `SELECT`, `INSERT`, `UPDATE`, `DELETE`, `DROP`, `CREATE`, `ALTER`, `EXEC`, `EXECUTE`

5. For each match:
   - Get line and column numbers
   - Extract the variable being interpolated
   - Create Issue with fix suggestion showing parameterized query alternative

**CREATE FILE:** `tests/fixtures/sql/` with:
- `string-concat.js` — vulnerable concat patterns
- `template-literal.ts` — vulnerable template literals
- `fstring.py` — Python f-string SQL
- `parameterized-safe.js` — correct parameterized queries (should NOT trigger)

**CREATE FILE:** `tests/core/detectors/sql.test.ts` with tests for each vulnerability pattern and safe patterns.

**TEST CRITERIA:** `npm test` passes.

---

## Prompt 6: Authentication Checker (Core Engine Part 3)

**GOAL:** Detect missing authentication on sensitive routes in Express.js, Flask, and FastAPI.

**CREATE FILE:** `src/core/detectors/auth.ts`

Requirements:

1. Create `AuthChecker` class implementing `Detector` interface

2. Supported extensions: `.js`, `.ts`, `.py`

3. Detection strategy:
   - Find route definitions (e.g., `app.get('/admin', ...)` in Express)
   - If route path matches sensitive patterns, check if auth middleware is present in subsequent lines
   - Sensitive paths: `/admin`, `/api/admin`, `/api/users`, `/api/delete`, `/dashboard`, `/api/private`
   - Auth middleware signals: `authenticate`, `requireAuth`, `isAuthenticated`, `passport.authenticate`, `jwt`, `auth`, `protect`, `verifyToken`

4. Match Express patterns:
   - `app.get/post/put/delete/patch('/path', handler)`
   - `router.get('/path', handler)`

5. Match Flask patterns:
   - `@app.route('/admin')` followed by function definition

6. Match FastAPI patterns:
   - `@app.get('/admin')` followed by function definition

7. For vulnerable routes:
   - Create Issue with CRITICAL severity for `/admin`, HIGH for other sensitive paths
   - Suggest adding auth middleware
   - Include the route path in the description

**CREATE FILE:** `tests/fixtures/auth/` with:
- `express-no-auth.js` — routes without auth
- `express-with-auth.js` — same routes with auth (should NOT trigger)
- `flask-routes.py` — Flask vulnerable routes

**CREATE FILE:** `tests/core/detectors/auth.test.ts`

**TEST CRITERIA:** `npm test` passes.

---

## Prompt 7: Main Scanner Orchestrator

**GOAL:** Wire all detectors together with file discovery, parallel scanning, scoring, and result aggregation.

**CREATE FILE:** `src/core/scanner.ts`

Requirements:

1. Define `ScannerOptions` interface:
   - `rootPath: string`
   - `config: VibeGuardConfig`

2. Function `scan(options: ScannerOptions): Promise<ScanResult>`
   - Record start time (`performance.now()` or `Date.now()`)
   - Call `discoverFiles()`
   - Initialize all detectors based on `config.detectors`
   - For each discovered file:
     - Call `readFileContent()`
     - Skip if null (binary, too large, etc.)
     - Run `detect()` on each enabled detector
     - Collect all issues
   - Track total lines scanned
   - Track files skipped

3. Function `scanFile(filePath: string, content: string, detectors: Detector[]): Issue[]`
   - Run each detector on the file
   - Flatten results
   - Return issue array

4. After all files scanned:
   - Deduplicate issues (same file + line + detectorId = duplicate)
   - Group by severity
   - Group by detector
   - Calculate category scores:
     - Base 100, subtract based on issues
     - Normalize per category
   - Calculate overall score (100 - weighted deductions)
     - CRITICAL: -15 each
     - HIGH: -8 each
     - MEDIUM: -4 each
     - LOW: -1 each
     - Floor at 0
   - Determine rating from score ranges
   - Set `passed = overallScore >= config.scoreThreshold`
   - Record end time, calculate duration

5. Export `AllDetectors` array containing all built-in detectors

**CREATE FILE:** `src/core/scoring.ts`

Requirements:
1. Function `calculateScore(issues: Issue[]): { overallScore: number; rating: ScoreRating }`
2. Function `calculateCategoryScore(name: string, issues: Issue[]): CategoryScore`
3. Function `deduplicateIssues(issues: Issue[]): Issue[]` — dedupe by filePath + line + detectorId

**CREATE FILE:** `tests/core/scanner.test.ts`
Tests:
- Scan a test project with known vulnerabilities → expect specific issues found
- Score calculation correctness
- Deduplication logic
- File skipping behavior

**TEST CRITERIA:** `npm test` passes. `npx tsc --noEmit` clean.

---

## Prompt 8: Terminal Output Formatter

**GOAL:** Create beautiful, color-coded console output for scan results.

**CREATE FILE:** `src/utils/output.ts`

Requirements:

1. Function `formatTextReport(result: ScanResult): string`
   - Build a beautiful terminal report using `chalk`
   - Output format:
     ```
     🛡️ VibeGuard Security Report v{version}
     ════════════════════════════════════════
     
     📁 Files scanned:     {filesScanned}
     ⏱️  Duration:          {durationMs}ms
     📊 Lines analyzed:    {linesScanned}
     
     ┌─────────────────────────────────────────┐
     │  Vibe Code Safety Score: {score}/100   │
     │  Rating: {emoji} {ratingLabel}          │
     └─────────────────────────────────────────┘
     
     🔒 Secrets:     {secretsScore}/100  ({secretsIssues} issues)
     🗄️  SQL:        {sqlScore}/100     ({sqlIssues} issues)
     🔑 Auth:        {authScore}/100     ({authIssues} issues)
     
     🚨 CRITICAL: {criticalCount}
     🔴 HIGH:     {highCount}
     🟠 MEDIUM:   {mediumCount}
     🟡 LOW:      {lowCount}
     
     Top Issues:
     ─────────────────────────────────────────
     🚨 [CRITICAL] {title}
     📄 {file}:{line}
     💡 {description}
     
     🔴 [HIGH] {title}
     ...
     
     ✅ Scan {passed ? 'PASSED' : 'FAILED'} (threshold: {threshold})
     ```

2. Function `formatJSONReport(result: ScanResult): string`
   - Pretty-printed JSON (2-space indent)

3. Function `formatBadge(score: number, rating: ScoreRating): string`
   - Return markdown badge code:
     ```markdown
     [![VibeGuard Score](https://img.shields.io/badge/VibeGuard-{score}%2F100-{color})](https://vibeguard.io)
     ```
   - Color mapping:
     - excellent → brightgreen
     - good → green
     - needs-work → yellow
     - poor → orange
     - critical → red

4. Function `printProgress(current: number, total: number, fileName: string): void`
   - Single-line progress bar with `process.stdout.write('\r...')`
   - Format: `[█████░░░░░] 45% (45/100) scanning auth.ts...`

**TEST CRITERIA:** Visual inspection sufficient. Can test manually with `npm run build && node dist/index.js scan .`

---

## Prompt 9: CLI Entry Point (All Commands)

**GOAL:** Build the complete CLI with all commands using Commander.js.

**CREATE FILE:** `src/cli/index.ts`

Requirements:

1. Use `commander` for CLI parsing

2. Setup `program` with:
   - Name: `vibeguard`
   - Description: `Security scanner for AI-generated code`
   - Version: read from `package.json`

3. Command: `scan <path>`
   - Options: `--output`, `--severity`, `--fail-below`, `--ignore`, `--no-badge`
   - Default path: `.`
   - Load config
   - If first time, show welcome message
   - Call `scan()`
   - Format output based on `--output`
   - If `--no-badge`, skip badge generation
   - Exit with appropriate code:
     - 0 if passed
     - 5 if below threshold
     - 2 if config error
     - 1 if generic error
   - Show progress bar during scanning

4. Command: `init`
   - Run `initConfig()`
   - Print success message
   - Show next steps

5. Command: `badge`
   - `--score <number>` manual score
   - Generate badge markdown
   - Print to console

6. Error handling:
   - Wrap main execution in try/catch
   - Handle `ConfigError` → exit 2 with nice message
   - Handle `SecurityError` → exit 4
   - Handle unknown errors → exit 1 with stack trace in debug mode

7. Add shebang: `#!/usr/bin/env node` (handled by tsup banner)

**CREATE FILE:** `tests/cli/index.test.ts`

Use `vitest`'s mocking to test CLI behavior without spawning processes.

**TEST CRITERIA:** Build with `npm run build`. Run `node dist/index.js --help`. Should show all commands.

---

## Prompt 10: GitHub Action

**GOAL:** Create the GitHub Action that runs VibeGuard on PRs.

**CREATE FOLDER:** `action/`

**CREATE FILE:** `action/action.yml`

```yaml
name: 'VibeGuard Security Scan'
description: 'Scan your code for AI-generated security vulnerabilities'
author: 'Mohit Baghel'
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
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
    
    - name: Install VibeGuard
      shell: bash
      run: npm install -g vibeguard
    
    - name: Run VibeGuard
      id: scan
      shell: bash
      run: |
        vibeguard scan ${{ inputs.scan-path }} \
          --output json \
          --fail-below ${{ inputs.fail-threshold }} \
          > vibeguard-results.json || true
        echo "score=$(jq -r '.overallScore' vibeguard-results.json)" >> $GITHUB_OUTPUT
        echo "critical-count=$(jq -r '.issuesBySeverity.critical | length' vibeguard-results.json 2>/dev/null || echo 0)" >> $GITHUB_OUTPUT
        echo "high-count=$(jq -r '.issuesBySeverity.high | length' vibeguard-results.json 2>/dev/null || echo 0)" >> $GITHUB_OUTPUT
        if [ $(jq -r '.passed' vibeguard-results.json) == "true" ]; then
          echo "scan-passed=true" >> $GITHUB_OUTPUT
        else
          echo "scan-passed=false" >> $GITHUB_OUTPUT
        fi
    
    - name: Upload SARIF
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
          const result = JSON.parse(fs.readFileSync('vibeguard-results.json', 'utf8'));
          const score = result.overallScore;
          const rating = result.rating;
          const issues = result.issues;
          const emoji = score >= 90 ? '🟢' : score >= 70 ? '🟡' : score >= 50 ? '🟠' : '🔴';
          
          const body = `## 🛡️ VibeGuard Security Report
          
          | Category | Score | Issues |
          |----------|-------|--------|
          ${Object.entries(result.categoryScores).map(([name, cat]) => `| ${name} | ${cat.score}/100 | ${cat.issueCount} |`).join('\n')}
          
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
```

**CREATE FILE:** `.github/workflows/ci.yml` (for this repo's own CI)

```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

**CREATE FILE:** `.github/workflows/release.yml`

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm run build
      - run: npm run test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      - uses: softprops/action-gh-release@v1
        with:
          generate_release_notes: true
          files: dist/index.js
```

**TEST CRITERIA:** Action YAML is valid. Can be validated with GitHub's action linter.

---

## Prompt 11: Pre-commit Hook Installer + Script

**GOAL:** Create the hook installation and the hook script itself.

**CREATE FILE:** `src/utils/hooks.ts`

Requirements:

1. Function `installPreCommitHook(rootPath: string): Promise<void>`
   - Check if `.git/hooks/pre-commit` exists
   - If yes, back it up to `.git/hooks/pre-commit.backup`
   - Write new pre-commit hook that:
     - Gets list of staged files: `git diff --cached --name-only --diff-filter=ACM`
     - Runs `vibeguard scan` on only those files
     - If CRITICAL issues found, exit 1 (block commit)
     - If HIGH issues found, print warning but allow (or block based on --severity flag)
     - Show summary with instructions

2. Function `removePreCommitHook(rootPath: string): Promise<void>`
   - Restore backup if exists
   - Otherwise remove hook

**CREATE FILE:** `src/commands/hook.ts`

CLI command handler for `vibeguard install-hook` and `vibeguard remove-hook`.

**CREATE FILE:** `tests/utils/hooks.test.ts`

Mock filesystem tests for hook installation.

**TEST CRITERIA:** Tests pass. Manual test: run `vibeguard install-hook`, then `git commit` on a repo with a secret — should block.

---

## Prompt 12: SARIF Output Format

**GOAL:** Support GitHub Security tab integration by generating SARIF output.

**CREATE FILE:** `src/utils/sarif.ts`

Requirements:

1. Convert `ScanResult` to SARIF v2.1.0 format

2. Map VibeGuard → SARIF:
   - `issue.id` → `result.ruleId`
   - `issue.title` → `result.message.text`
   - Severity: CRITICAL/HIGH → `error`, MEDIUM → `warning`, LOW → `note`
   - `issue.filePath` → `locations[0].physicalLocation.artifactLocation.uri`
   - `issue.line` → `locations[0].physicalLocation.region.startLine`
   - `issue.column` → `locations[0].physicalLocation.region.startColumn`
   - `issue.description` → `message.markdown`

3. Include `tool.driver.rules` array with all rules that triggered

4. Function `toSarif(result: ScanResult): SarifOutput`

5. Function `writeSarifFile(result: ScanResult, outputPath: string): Promise<void>`

**TEST CRITERIA:** Run `npx @microsoft/sarif-multitool validate` on the output file (optional, manual check).

---

## Prompt 13: Integration Test — Full Scan

**GOAL:** Create a complete end-to-end test with a mock project.

**CREATE FOLDER:** `tests/fixtures/complete-project/`

```
tests/fixtures/complete-project/
├── src/
│   ├── auth.js         # Should trigger: missing auth, hardcoded secret
│   ├── db.ts           # Should trigger: SQL injection
│   └── config.py       # Should trigger: hardcoded DB password
├── package.json
└── .vibeguard.yaml     # Custom config for test
```

**src/auth.js:**
```javascript
const API_KEY = "ghp_abcdefghijklmnopqrstuvwxyz1234";

app.post('/login', (req, res) => {
  res.json({ token: API_KEY });
});

app.get('/admin/users', (req, res) => {
  res.json({ users: [] });
});
```

**src/db.ts:**
```typescript
function getUser(id: string) {
  const query = `SELECT * FROM users WHERE id = '${id}'`;
  return db.query(query);
}

function searchUsers(search: string) {
  return db.execute(`SELECT * FROM users WHERE name LIKE '%${search}%'`);
}
```

**src/config.py:**
```python
DB_CONFIG = {
    "host": "localhost",
    "password": "SuperSecret123!",
    "api_key": "sk-live-abcdefghijklmnopqrstuvwxyz1234"
}

def login(email):
    query = f"SELECT * FROM users WHERE email = '{email}'"
    cursor.execute(query)
```

**CREATE FILE:** `tests/integration/scan.test.ts`

Test that scanning this fixture returns:
- At least 1 CRITICAL issue (hardcoded secret)
- At least 1 HIGH issue (SQL injection)
- At least 1 HIGH issue (missing auth)
- Overall score < 80

---

## Prompt 14: README & Documentation

**GOAL:** Write a compelling README that drives adoption.

**CREATE FILE:** `README.md`

```markdown
# 🛡️ VibeGuard

> Security scanner for AI-generated code. Catch vulnerabilities before they ship.

[![npm version](https://badge.fury.io/js/vibeguard.svg)](https://www.npmjs.com/package/vibeguard)

## Why VibeGuard?

AI coding tools (Cursor, Claude Code, GitHub Copilot) write code incredibly fast — but they frequently introduce security vulnerabilities:

- 🔑 Hardcoded API keys and secrets
- 💉 SQL injection via string interpolation
- 🔓 Missing authentication on sensitive routes
- 🏗️ Architectural anti-patterns

**Existing tools weren't designed for AI-generated code.** VibeGuard is.

## Quick Start

```bash
# Install globally
npm install -g vibeguard

# Scan your project
vibeguard scan ./

# Or run without installing
npx vibeguard scan ./
```

## Vibe Code Safety Score

Every scan gives you a **0-100 score**:

| Score | Rating | Badge |
|-------|--------|-------|
| 90-100 | 🟢 Excellent | ![green](https://img.shields.io/badge/VibeGuard-95%2F100-brightgreen) |
| 70-89 | 🟡 Good | ![yellow](https://img.shields.io/badge/VibeGuard-73%2F100-yellow) |
| 50-69 | 🟠 Needs Work | ![orange](https://img.shields.io/badge/VibeGuard-55%2F100-orange) |
| 0-49 | 🔴 Critical | ![red](https://img.shields.io/badge/VibeGuard-30%2F100-red) |

## Installation Options

### CLI
```bash
npm install -g vibeguard
vibeguard scan ./ --output json
```

### Pre-commit Hook
```bash
vibeguard install-hook
# Automatically blocks commits with CRITICAL issues
```

### GitHub Action
```yaml
- uses: vibeguard/scan-action@v1
  with:
    fail-threshold: 60
```

## What VibeGuard Detects

| Category | Patterns | Severity |
|----------|----------|----------|
| **Secrets** | AWS keys, GitHub tokens, Stripe keys, JWT, DB passwords | CRITICAL |
| **SQL Injection** | f-strings, template literals, string concat in queries | CRITICAL |
| **Auth** | Missing auth on /admin, /api/*, sensitive routes | HIGH |
| **Files** | .env files committed, exposed credentials | HIGH |

## Configuration

Create `.vibeguard.yaml` in your project root:

```yaml
minSeverity: medium
scoreThreshold: 70
ignore:
  - "**/tests/**"
  - "**/*.test.ts"
detectors:
  secrets: true
  sql: true
  auth: true
```

## Supported Languages

- JavaScript / TypeScript
- Python
- JSON / YAML (config files)
- .env files

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | ✅ Scan passed |
| 1 | 💥 Unexpected error |
| 2 | ⚙️ Config error |
| 5 | 📉 Score below threshold |

## License

MIT
```

---

## 🚀 Build Checklist

After running all prompts, verify:

```bash
# 1. Type check
npm run typecheck

# 2. Run all tests with coverage
npm run test:coverage

# 3. Build the CLI
npm run build

# 4. Test the built CLI
node dist/index.js --help
node dist/index.js scan ./
node dist/index.js badge --score 85

# 5. Test on a real project
node dist/index.js scan ~/some-project

# 6. Local npm link (optional)
npm link
vibeguard scan ./
```

---

## 📝 Git Commit Strategy

```bash
# After Prompt 1
git add src/types/ && git commit -m "feat(types): add core data models"

# After Prompt 2
git add src/utils/files.ts && git commit -m "feat(utils): add file discovery engine"

# After Prompt 3
git add src/utils/config.ts && git commit -m "feat(config): add configuration system"

# After Prompt 4
git add src/core/detectors/secrets.ts && git commit -m "feat(detector): add secret scanner"

# After Prompt 5
git add src/core/detectors/sql.ts && git commit -m "feat(detector): add SQL injection detector"

# After Prompt 6
git add src/core/detectors/auth.ts && git commit -m "feat(detector): add auth checker"

# After Prompt 7
git add src/core/scanner.ts && git commit -m "feat(core): add main scanner orchestrator"

# After Prompt 8
git add src/utils/output.ts && git commit -m "feat(output): add terminal report formatter"

# After Prompt 9
git add src/cli/index.ts && git commit -m "feat(cli): add CLI entry point with all commands"

# After Prompt 10
git add action/ .github/ && git commit -m "feat(ci): add GitHub Action integration"

# After Prompt 11
git add src/utils/hooks.ts && git commit -m "feat(hooks): add pre-commit hook installer"

# After Prompt 12
git add src/utils/sarif.ts && git commit -m "feat(sarif): add SARIF output format"

# After Prompt 13
git add tests/ && git commit -m "test(integration): add end-to-end scan test"

# After Prompt 14
git add README.md && git commit -m "docs: add README"

# Final tag
git tag v0.1.0
git push origin main --tags
```

---

## 🎯 Metrics After v0.1.0

| Metric | Target | How to Check |
|--------|--------|--------------|
| CLI installs | 50/week | `npm view vibeguard` |
| Test coverage | >85% | `npm run test:coverage` |
| Scan speed | <2s for 100 files | `time vibeguard scan ./` |
| False positive rate | <5% | Manual review |
| GitHub Stars | 100 | github.com/you/vibeguard |

---

**Ready to build? Start with Prompt 1 and work through each one. Each prompt is self-contained and ready to paste into your AI coding assistant.**
