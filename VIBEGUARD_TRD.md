# VibeGuard — Technical Requirements Document (TRD)

**Version:** 2.0  
**Date:** June 12, 2026  
**Status:** Draft  
**Author:** Mohit Baghel  
**Companion Document:** `VIBEGUARD_PRD.md`

---

## 1. Document Purpose & Technical Overview

This TRD translates the VibeGuard PRD into **implementable technical specifications**. It defines system architecture, API contracts, data models, infrastructure, performance requirements, security internals, and integration protocols.

### 1.1 Technical Constraints
- **Offline Capable**: Must run entirely offline for local CLI and IDE scans (no external API calls for basic scans).
- **Latency**: Core parsing and scanning must complete in < 500ms per file, < 30 seconds for repos < 10k files.
- **Safety**: Must not execute any scanned code.
- **Cross-Platform**: CLI and IDE extensions must work seamlessly across Windows, macOS, and Linux.

---

## 2. System Architecture Overview

### 2.1 Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
│  ┌────────────┐  ┌───────────┐  ┌────────────┐  ┌─────────────┐  ┌───────┐  │
│  │ VS Code /  │  │ CLI Tool  │  │ Git Hook   │  │ MCP Server  │  │ Chat  │  │
│  │ JetBrains  │  │ (Rust)    │  │ Wrapper    │  │ (TypeScript)│  │ Plugin│  │
│  └──────┬─────┘  └─────┬─────┘  └──────┬─────┘  └──────┬──────┘  └───┬───┘  │
│         │              │               │               │             │      │
│         └──────────────┼───────────────┼───────────────┼─────────────┘      │
│                        ▼               ▼               ▼                    │
│              ┌───────────────────────────────────────────────┐              │
│              │          VibeGuard Core Engine (Rust)         │              │
│              │            Compiled to native + WASM          │              │
│              │  ┌──────────┐  ┌──────────────┐  ┌─────────┐  │              │
│              │  │  Scanner │  │ Policy Engine│  │ SBOM Gen│  │              │
│              │  └──────────┘  └──────────────┘  └─────────┘  │              │
│              │  ┌──────────┐  ┌──────────────┐  ┌─────────┐  │              │
│              │  │  Secret  │  │ Remediation  │  │ Taint   │  │              │
│              │  │  Detector│  │ Engine (LLM) │  │ Analysis│  │              │
│              │  └──────────┘  └──────────────┘  └─────────┘  │              │
│              └──────────────────────┬────────────────────────┘              │
│                                     │ IPC / HTTP                            │
│                                     ▼                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                              SERVICE LAYER                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                     VibeGuard Server (Rust/Axum)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────┐  │  │
│  │  │ Auth     │  │ Scan API │  │ Policy   │  │ Webhook    │  │ SBOM  │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  └───────┘  │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  ┌───────┐  │  │
│  │  │ AI Score │  │ Feedback │  │ Notifier │  │ Agent API  │  │ LLM   │  │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └────────────┘  └───────┘  │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
├─────────────────────────────────────┼───────────────────────────────────────┤
│                                DATA LAYER                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │
│  │  PostgreSQL  │  │    Redis     │  │   S3/R2      │  │ ClickHouse     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Responsibilities
- **Core Scanner (Rust/WASM):** AST parsing, pattern matching, taint analysis, SBOM generation.
- **CLI Tool (Rust):** Local scanning, config management, auto-remediation triggers.
- **IDE Extensions (TS/LSP):** Inline diagnostics, quick-fix actions, Copilot/Cursor native chat integration.
- **MCP Server (TS):** Enables Claude Code/Cursor autonomous scanning and fixing.
- **API Server (Rust/Axum):** Dashboard backend, auth, LLM integration, webhook dispatch.
- **Dashboard (Next.js 15):** UI for posture overview, AI Trust Score, GitOps policy management.
- **Runtime Agent (OpenTelemetry):** Non-blocking sidecar for observability (v1.5).

---

## 3. Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Core Engine** | Rust (`tree-sitter`, `rayon`) | High concurrency, memory safety, WASM cross-compilation. |
| **CLI** | Rust (`clap`) | Fast startup and native binaries. |
| **Backend API** | Rust (`Axum`, `Tokio`) | High performance for handling large-scale scans and telemetry. |
| **Dashboard** | Next.js 15, React 19, Tailwind | Modern web standard, fast iteration. |
| **Database** | PostgreSQL, Redis, ClickHouse | ClickHouse added for high-volume runtime telemetry and historical scan analytics. |
| **IDE Extension** | TypeScript + LSP | Standardized communication with VS Code and JetBrains. |
| **Runtime Agent** | Rust/eBPF or OpenTelemetry | Zero-overhead production monitoring. |

---

## 4. Core Scanner Engine

### 4.1 Parsing Pipeline
1. **Language Detection:** Extension-based with content heuristic fallback.
2. **AST Extraction:** `tree-sitter` bindings for CST parsing across JS, TS, Python, Go, Java, C#, PHP.
3. **Pattern Matching:** Parallel execution via `rayon` matching nodes against rules.
4. **Taint Analysis & Prompt Injection Detection:** Tracks data flow from *sources* (e.g., HTTP request params) to *sinks* (e.g., `openai.chat.completions.create`, `exec()`).
5. **SBOM Generation:** Parses `package-lock.json`, `requirements.txt`, etc., outputting CycloneDX/SPDX.

### 4.2 Semantic/Context-Aware Analysis
Uses `.vibeguard/context.yml` to minimize false positives by understanding business logic:
```yaml
trusted_inputs:
  - "req.user.id"
llm_call_patterns:
  - "openai.chat.completions.create"
```
The scanner loads these definitions into its AST matching logic before evaluating rules.

### 4.3 Secret Detection
Combines entropy analysis (Shannon entropy > 4.5) with pattern matching.
- **High-confidence Patterns:** AWS Keys (`AKIA...`), GitHub Tokens (`ghp_...`).
- **False Positive Filtering:** Skips comments, test files (`.test.ts`), and template literals in error messages.

### 4.4 Dependency Vulnerability Checker
- Parses lock files and matches against a locally cached OSV/NVD database (updated daily).

---

## 5. Remediation Engine & Feedback Loop

### 5.1 LLM-Assisted Remediation (`vibeguard fix --ai`)
- **Pipeline:** AST vulnerability found → Context gathered (surrounding function, imports, framework) → Sent to LLM (local via Ollama/llama.cpp or cloud API) → Patch generated → AST validation of patch → Diff presented to user.
- **Prompt Example:** `Fix this SQL injection in Express.js. Use parameterized queries for the pg library.`

### 5.2 Developer Feedback & Suppression Registry
- **Inline Suppression:** `# vibeguard:ignore VG-SECRET-001 reason="test fixture"`
- Suppressions are parsed during the AST phase and recorded.
- Telemetry (if opted-in) sends suppression reasons to the backend to refine community rules.

---

## 6. API Contracts & Data Models

### 6.1 Local Scan API (Rust Core)
```rust
pub struct ScanResult {
    pub findings: Vec<Finding>,
    pub scan_metadata: ScanMetadata,
    pub summary: ScanSummary,       // total findings, risk_score (0-100)
    pub sbom: Option<SbomData>,     // Optional CycloneDX/SPDX payload
}

pub struct Finding {
    pub id: String,
    pub rule_id: String,
    pub severity: Severity,
    pub file: PathBuf,
    pub line: u32,
    pub message: String,
    pub code_snippet: String,
    pub fix: Option<FixSuggestion>, // Template or LLM-generated patch
    pub taint_trace: Option<Vec<TaintStep>>, 
    pub ai_tool_source: Option<String>, // Tracks which AI tool generated the code
}
```

### 6.2 PostgreSQL Schema Highlights
- **organizations**: `id`, `name`, `plan`, `settings`.
- **scans**: `id`, `trigger`, `risk_score`, `scan_duration_ms`.
- **ai_trust_scores**: `org_id`, `tool_name` (e.g., "Copilot"), `score`, `provenance_percentage`.
- **findings**: `id`, `scan_id`, `rule_id`, `severity`, `file_path`, `suppressed`, `suppression_reason`.

---

## 7. Integrations & Client Interfaces

### 7.1 MCP Server Protocol
Enables AI assistants (Claude, Cursor) to run VibeGuard in a closed loop.
- `vibeguard_scan`: Scans code files and returns findings.
- `vibeguard_scan_diff`: Scans a git diff.
- `vibeguard_get_fix`: Gets the auto-fix suggestion.

### 7.2 Native Chat Plugin (VS Code / JetBrains)
Integrates directly into Copilot Chat / Cursor Composer:
- Registers a chat participant: `@vibeguard`.
- Can access the active editor window and run a memory-based scan via WASM without saving to disk.

### 7.3 GitOps & Configuration System
Configuration is driven by `.vibeguard/policies/org-policy.yml` in the project root:
```yaml
enforce:
  - no-hardcoded-secrets: block
  - prompt-injection: block
exceptions:
  - file: "tests/**"
    rules: ["VG-SECRET-*"]
    reason: "Test fixtures"
```

---

## 8. Infrastructure, Deployment & CI/CD

### 8.1 Deployment Architecture (Cloud API)
- **Container Orchestration:** Kubernetes (EKS/GKE) or ECS Fargate.
- **ClickHouse:** For storing high-volume OpenTelemetry runtime events and scan analytics.
- **CI/CD:** GitHub Actions for builds, tests, and publishing.

### 8.2 GitHub Actions Integration (`vibeguard/scan-action`)
- Triggered on `push` or `pull_request`.
- Generates structured PR comments, SARIF output for GitHub's Security tab, and optionally attaches the SBOM artifact.

### 8.3 Webhook Notifier
- Dispatches JSON payloads to Slack/Microsoft Teams incoming webhooks for critical alerts based on org policy.

---

## 9. Runtime Observability Agent (v1.5)

### 9.1 Observability Mode (Non-Blocking)
- **Architecture:** Lightweight library or eBPF sidecar.
- **Functionality:** Hooks into common sinks (e.g., `exec`, HTTP clients, DB drivers) to detect unsafe patterns executed at runtime.
- **Transport:** Emits OpenTelemetry (OTLP) traces to the VibeGuard backend (ClickHouse).
- **Performance Constraints:** Must add < 1ms latency per instrumented call. Zero blocking logic.

---

## 10. Performance & Security Engineering

### 10.1 Performance Goals
- **Single File Parse:** < 50ms.
- **Project Scan (1,000 files):** < 2s via `rayon` parallelization.
- **WASM Payload Size:** < 5MB for IDE extension fast activation.

### 10.2 Security Hardening
- **No Code Execution:** The scanner relies purely on AST parsing and Regex.
- **Privacy by Default:** Local scans stay entirely local. The MCP server processes data offline. LLM-assisted fixes use local models by default.
- **Redaction:** Secrets found in logs or API responses are automatically redacted (`AKIA********1234`).

---

## 11. Testing & Monitoring Strategy
- **Unit Tests:** High coverage (>90%) for individual rule matchers using `cargo test`.
- **Prompt Injection Corpus:** Dedicated fixture suite of advanced prompt injection attacks to benchmark detection accuracy.
- **Performance Profiling:** Continuous benchmarking of scan speeds on large codebases.

---

## Appendix: References
- OWASP Top 10 for LLM Applications.
- CycloneDX / SPDX specifications for SBOM generation.
- Model Context Protocol (MCP) specification.
