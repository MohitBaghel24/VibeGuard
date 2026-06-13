<div align="center">
  <img src="https://img.shields.io/badge/Security-100%25-brightgreen?style=for-the-badge" alt="Security 100%" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License MIT" />
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tests-Vitest-brightgreen?style=for-the-badge&logo=vitest" alt="Vitest" />
  
  <h1>🛡️ VibeGuard</h1>
  
  <p><strong>The security spell-checker for AI-written code.</strong><br>
  <em>Ship faster with AI. Sleep better with VibeGuard.</em></p>
</div>

<div align="center">
  <img src="docs/assets/terminal_scan.png" alt="VibeGuard CLI Terminal Output" width="600" />
</div>

---

## 🤔 What is VibeGuard?

AI tools like ChatGPT, Claude, and GitHub Copilot write incredible code in seconds. But just like a fast writer can make typos, AI can accidentally write **security holes** — hardcoded passwords, open doors to your database, or missing login checks on admin pages.

**VibeGuard is your automated security guard.** It reads your project's code and tells you if the AI left any accidental "unlocked doors" behind.

Think of it like **Grammarly, but for security instead of grammar.**

### 🎯 What it catches

| Problem | What it means in plain English |
|--------|--------------------------------|
| 🔑 **Exposed Secrets** | Did the AI accidentally paste a real password or API key into the code? |
| 💉 **SQL Injection** | Did the AI write a database query that a hacker could trick into deleting everything? |
| 🔓 **Missing Login Walls** | Did the AI create an `/admin` page that anyone can visit without logging in? |
| 🕸️ **XSS & Path Traversal** | Did the AI write unsanitized dynamic scripts or file handlers? |
| 💻 **Command Injection & SSRF** | Did the AI pass raw user input into OS commands or internal network requests? |
| 🤖 **AI Hallucinations** | Did the AI import a package that doesn't actually exist (which hackers love to claim)? |

---

## 🧠 Advanced AST Taint Engine
VibeGuard doesn't just use simple word-matching. It features a lightweight, lightning-fast **Abstract Syntax Tree (AST) Taint Analyzer**. 

If the AI takes an unsafe payload on line 2, passes it into a variable on line 5, and executes it on line 12... VibeGuard traces the data flow and catches the vulnerability! 

*(And the best part? It uses 100% JavaScript APIs. No heavy native C++ dependencies required!)*

---

## 🚀 Getting Started

### Run instantly — no install needed
```bash
npx vibeguard-scan scan .
```

### Interactive Auto-Fixer 🔧
Did VibeGuard find a leaked password? Tell it to fix it!
```bash
npx vibeguard-scan fix .
```
*VibeGuard will interactively step through the vulnerabilities and seamlessly drop environment variables into your code!*

### Install globally
```bash
npm install -g vibeguard-scan
vibeguard scan .
```

### Install as a dev dependency
```bash
npm install -D vibeguard-scan
```

### Configure your project
```bash
npx vibeguard-scan init   # Creates .vibeguard.yaml
```

**Example config (`.vibeguard.yaml`):**
```yaml
minSeverity: low
scoreThreshold: 70
ignore:
  - "**/node_modules/**"
  - "**/dist/**"
  - "**/*.test.ts"
extensions:
  - ".js"
  - ".ts"
  - ".jsx"
  - ".tsx"
  - ".py"
  - ".env"
detectors:
  secrets: true    
  sql: true        
  auth: true       
  cmdInjection: true
  ssrf: true
  astTaint: true
outputFormat: text
showBadge: true
```

### Inline Ignore Comments
Need to bypass a rule? Just drop this comment above the line:
```javascript
// vibeguard-disable-next-line secrets:aws-access-key
const KEY = "AKIAIOSFODNN7EXAMPLE";
```

### Git Pre-Commit Hook
Block commits that contain security issues:
```bash
npx vibeguard-scan hook install
```

### GitHub Actions (SARIF Output)
Add `.github/workflows/vibeguard.yml` so VibeGuard comments directly on your Pull Requests:
```yaml
name: VibeGuard Security Scan
on: [push, pull_request]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx vibeguard-scan scan . --format sarif > vibeguard-results.sarif
      - name: Upload SARIF to GitHub
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: vibeguard-results.sarif
```

---

## 🤖 AI Agent Integration (MCP Server)

VibeGuard comes with a built-in **Model Context Protocol (MCP)** server. This allows AI code assistants like Cursor, Claude Desktop, and Antigravity to autonomously scan the code they write in the background, and fix their own security vulnerabilities *before* you even see them!

### Connecting to Cursor or Antigravity
1. Open your editor's **Settings** and navigate to the **MCP Servers** tab.
2. Click **Add New MCP Server**.
3. Name: `VibeGuard`
4. Type: `command`
5. Command: `npx -y vibeguard-scan mcp`
6. Click Save! Now just ask your AI: *"Use VibeGuard to scan this file for vulnerabilities."*

### Connecting to Claude Desktop
Add this to your `claude_desktop_config.json` (then completely restart Claude):
```json
{
  "mcpServers": {
    "vibeguard": {
      "command": "npx",
      "args": ["-y", "vibeguard-scan", "mcp"]
    }
  }
}
```

---

## 📊 Your "Vibe Code Safety Score"

After scanning, you get a simple **0-100 safety score**:

- 🟢 **90–100** — Excellent. Your code looks clean.
- 🟡 **70–89** — Good. Minor suggestions only.
- 🟠 **50–69** — Needs work. Some risks found.
- 🔴 **0–49** — Critical. Fix before shipping!

---

## 🏗️ Architecture & Tech Stack

```text
┌──────────────────────────────────────────────────────────────┐
│                      VIBEGUARD CLI                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │
│  │ Commands   │  │ Core       │  │ Utilities              │  │
│  │ scan       │──│ Scanner    │──│ Config (.vibeguard.yml)│  │
│  │ init       │  │ ├── AST    │  │ Files (glob, filters)  │  │
│  │ badge      │  │ ├── SQL    │  │ Output (text, JSON,    │  │
│  │ hook       │  │ └── Auth   │  │        SARIF, badge)   │  │
│  │ fix        │  │ └── Secrets│  │                        │  │
│  └────────────┘  └────────────┘  └────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.x (ES2022) |
| Bundler | `tsup` (ESM, single-file) |
| Testing | Vitest + V8 Coverage (100% Core coverage) |
| Config Validation | Zod |
| Terminal Styling | Chalk & Inquirer |
| File Globbing | Globby |
| AST Engine | TypeScript Compiler API |

---

## 🗺️ Roadmap

### ✅ Shipped (v0.1)
- [x] Core scanner engine & Vibe Code Safety Score (0-100)
- [x] 6 base detectors (Secrets, SQLi, Auth, CmdInjection, SSRF, XSS/Traversal)
- [x] AST Taint Flow Tracking Engine
- [x] AI Hallucination detector
- [x] Interactive Auto-Fixer (`fix .`)
- [x] Text / JSON / SARIF output
- [x] `.vibeguard.yaml` configuration
- [x] Git pre-commit hook
- [x] Badge generator
- [x] MCP Server (Claude Code / Cursor integration)

### 🚀 Coming Soon
- [ ] VS Code Extension (inline diagnostics + quick fixes)
- [ ] `vibeguard dashboard` (local HTML security report)
- [ ] SBOM generation (package vulnerability scanning)

---

## 📄 License

MIT © [Mohit Baghel](https://github.com/MohitBaghel24)

---

<p align="center">
  <i>"Ship AI code fast — without shipping vulnerabilities."</i>
</p>
