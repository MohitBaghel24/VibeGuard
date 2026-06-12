# 🛡️ VibeGuard

> The ultimate security scanner for AI-generated code.

[![VibeGuard Score](https://img.shields.io/badge/VibeGuard-100%2F100-brightgreen)](https://vibeguard.io)

AI coding assistants are great, but they sometimes introduce subtle security vulnerabilities. VibeGuard is a fast, lightweight, and configurable CLI tool that acts as your final defense line, scanning your codebase for secrets, SQL injections, missing authentication, and more.

## Features

- **Fast & Lightweight:** Built in TypeScript, using regex and heuristics.
- **AI-Focused Detectors:** specifically targets vulnerabilities often introduced by LLMs.
- **Secrets Detection:** Finds AWS keys, GitHub tokens, passwords, and other hardcoded secrets.
- **SQL Injection Detection:** Detects string concatenation and unparameterized queries.
- **Auth Checking:** Highlights sensitive routes missing authentication middleware.
- **Scoring System:** Gives your project a "Vibe Code Safety Score" from 0 to 100.
- **CI/CD Ready:** Export reports in JSON or SARIF for seamless integration.

## Installation

You can run VibeGuard instantly using `npx`, or install it globally/locally.

```bash
# Run without installing
npx vibeguard-scan scan .

# Install globally
npm install -g vibeguard-scan

# Install as a dev dependency
npm install -D vibeguard-scan
```

## Usage

### Basic Scan

Scan the current directory:

```bash
vibeguard-scan scan .
```

Scan a specific directory and fail if the score drops below 80:

```bash
vibeguard-scan scan src/ --fail-below 80
```

### Configuration

Initialize a default configuration file in your project:

```bash
vibeguard-scan init
```

This creates a `.vibeguard.yaml` file where you can customize the scanner:

```yaml
minSeverity: low
scoreThreshold: 50
ignore:
  - "**/node_modules/**"
  - "**/.git/**"
  - "**/dist/**"
  - "**/build/**"
  - "**/*.min.js"
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

### Git Hooks

Prevent vulnerable code from being committed by installing the pre-commit hook:

```bash
vibeguard-scan hook install
```

To remove the hook:

```bash
vibeguard-scan hook uninstall
```

## Integrating with GitHub Actions

VibeGuard includes a composite GitHub Action that you can easily drop into your workflows.

Create a `.github/workflows/vibeguard.yml` file:

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
      
      # Use the VibeGuard Action
      - name: VibeGuard Scan
        uses: ./action
        with:
          path: '.'
          fail-below: '70'
```

## License

MIT License. See LICENSE for details.
