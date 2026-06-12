# VibeGuard — Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** June 12, 2026  
**Status:** Draft  
**Author:** Mohit Baghel

---

## 1. Executive Summary

VibeGuard is a **security guardrail platform** for AI-assisted ("vibe") coding workflows. It acts as an automated security gate between AI code generation and production deployment — scanning, validating, and securing AI-generated code before it enters a codebase. It provides a "Vibe Code Safety Score" and helps developers ship secure vibe-coded applications.

As AI-powered coding tools (Claude Code, GitHub Copilot, Cursor, ChatGPT, etc.) accelerate development velocity, they simultaneously widen the **security gap**: code ships faster than any team can manually review it. VibeGuard closes that gap.

**One-line pitch:** *"Ship AI code fast — without shipping vulnerabilities."*

---

## 2. Problem Statement

### 2.1 The Rise of Vibe Coding
"Vibe coding" — a term coined by Andrej Karpathy in early 2025 — describes the practice of relying on AI assistants to generate, modify, and repair code from natural-language prompts. The developer acts as an architect, focusing on intent and outcomes rather than line-by-line implementation.

- GitHub reports that **92% of developers** now use AI coding tools (2026 survey).
- Enterprise teams are shipping **3–5x more code** with AI assistance.
- The barrier to building software has never been lower.

### 2.2 The Security Gap
Speed without guardrails is dangerous. AI-generated code consistently exhibits:
- **Hardcoded Secrets:** API keys, passwords, tokens embedded directly in source.
- **Missing Input Validation:** SQL injection, XSS, command injection vectors.
- **Insecure Dependencies:** Packages with known CVEs pulled without vetting.
- **Broken Authentication:** JWT misconfigurations, missing auth middleware, session flaws.
- **Over-Privileged Access:** IAM roles with `*` permissions, open CORS, public storage buckets.
- **Architectural Violations:** Code that bypasses established patterns (e.g., skipping RLS).
- **Data Exposure:** PII logged in plaintext, unencrypted storage, missing redaction.

### 2.3 Why Existing Tools Fall Short
- **SAST/DAST tools** (SonarQube, Semgrep, Checkmarx) are designed for human-written code and post-commit analysis. They lack **real-time, pre-commit** intervention at the AI generation boundary.
- **AI code linters** focus on style/completeness, not security posture.
- **No tool today** specifically addresses the unique threat model of AI-generated code.

---

## 3. Product Vision

> **VibeGuard makes every line of AI-generated code safe by default — without slowing developers down.**

### 3.1 Guiding Principles
1. **Speed is a feature.** Guardrails must add < 2 seconds of latency to any workflow.
2. **Developer-first, not auditor-first.** Surface issues with fix suggestions, not just red flags.
3. **Zero-config to start, deep-config to scale.** Works out of the box; enterprise teams can customize policies.
4. **Context-aware.** Understands the project's stack, architecture, and security policies.
5. **Shift-left, but also shift-everywhere.** Integrate at every stage: IDE, pre-commit, CI/CD, runtime.

---

## 4. Target Users & Personas

### 4.1 Primary Personas

| Persona | Description | Key Need |
|---------|-------------|----------|
| **Solo Vibe Coder / Student** | Indie developer, startup founder, or student using AI tools. | Instant security feedback without slowing down. Knows code is secure. |
| **Engineering Team Lead** | Manages a team that uses AI coding tools daily. | Policy enforcement, visibility into AI-generated code risk for PR approval. |
| **AppSec / DevSecOps Engineer** | Responsible for organizational security posture. | Automated gate that scales with AI code volume. Identifies AI vulnerabilities. |
| **CTO / VP Engineering** | Makes buy decisions, cares about risk exposure. | Compliance dashboards, risk metrics, audit trails. |

### 4.2 Core User Stories
- **AS A** student developer, **I WANT** to know if my AI-generated code has security issues, **SO THAT** I don't ship vulnerable applications to production.
- **AS A** solo developer, **I WANT** to show my projects are secure, **SO THAT** I can demonstrate code quality to collaborators and users.
- **AS A** team lead, **I WANT** to enforce security standards on AI-generated code, **SO THAT** I can approve PRs with confidence.
- **AS A** security auditor, **I WANT** to quickly identify AI-specific vulnerabilities, **SO THAT** I can audit vibe-coded projects efficiently.

---

## 5. Goals & Success Metrics

### 5.1 Business & Product Goals
| Goal | Metric | Target (6 months) |
|------|--------|-------------------|
| **Prevent secrets in production** | Secrets leaked in codebase | 0 (sustained) |
| **Catch critical vulnerabilities** | % of CRITICAL/HIGH issues caught pre-commit | > 95% |
| **Maintain developer velocity** | Avg. time added per AI-assisted commit | < 2 seconds |
| **Adoption** | Active weekly users / Active Repos Scanned | 10,000+ / 3,000 |
| **Developer satisfaction** | NPS from active users | > 50 |
| **Community Growth** | GitHub Stars / npm/pypi Downloads | 5,000+ / 50,000 |

### 5.2 User Engagement Goals
- **Scan completion rate:** > 80%
- **Badge adoption rate:** > 40% of scans
- **GitHub Action installation rate:** > 25% of users
- **Pre-commit hook adoption rate:** > 15% of users
- **User retention (30-day):** > 30%

---

## 6. Feature Requirements

### 6.1 Core Scanning Engine
**FR-01: Real-Time Code Scanning**
- Scan code diffs as generated. Response time: < 500ms for single-file, < 2s for multi-file.
- Support: TypeScript, JavaScript, Python, Go, Rust, Java, C#, PHP.

**FR-02: Vulnerability Detection**
- **Secrets:** AWS Keys, GitHub Tokens, Generic API Keys, Private Keys, DB Passwords, JWT tokens.
- **SQL Injection:** Identifies unsafe db query construction (e.g. f-strings, template literals).
- **Authentication/Authorization:** Flags missing/insecure auth on sensitive routes (Admin routes without auth decorators).
- **OWASP Top 10:** Path traversal, XSS, SSRF, broken auth, crypto weaknesses, CVE matching.

**FR-03: AI-Specific Threat Detection**
- Hallucinated library imports.
- Prompt injection vectors.
- Overly permissive defaults (open CORS, `allowAll`).
- Missing error handling (bare `try/catch`).
- Infinite loop / resource exhaustion patterns.

**FR-04: Severity Classification**
- **CRITICAL:** Exploitable, immediate risk (e.g., hardcoded DB password).
- **HIGH:** Likely exploitable with moderate effort (e.g., SQL injection).
- **MEDIUM:** Potential risk under certain conditions.
- **LOW / INFO:** Best practice violation, style/suggestion.

### 6.2 Vibe Code Safety Score & Reporting
**FR-05: Vibe Code Safety Score**
- Composite 0–100 score summarizing codebase security posture.
- Deductions: CRITICAL (-15), HIGH (-8), MEDIUM (-4), LOW (-1).
- Rating Bands: 90–100 (🟢 Excellent), 70–89 (🟡 Good), 50–69 (🟠 Needs Work), 25–49 (🔴 Poor), 0–24 (⚫ Critical).

**FR-06: README Badge Generator**
- Generates a shareable shield/badge for README files.

### 6.3 Integration Layer
**FR-07: CLI Tool**
- Commands: `vibeguard scan`, `vibeguard guard`, `vibeguard init`, `vibeguard fix`, `vibeguard badge`, `vibeguard dashboard`.
- Beautiful terminal UI with color-coded output. JSON output mode for scripting.

**FR-08: IDE Extension**
- VS Code extension (primary), JetBrains plugin (v1.5).
- Inline diagnostics, status bar indicator (🟢/🟡/🔴), hover tooltips, and code actions (quick fixes).

**FR-09: Git Hooks (Pre-Commit)**
- Runs `vibeguard guard` on staged files. Blocks commit if CRITICAL issues are present. Support for `vibeguard guard --fix`.

**FR-10: CI/CD Integration**
- GitHub Actions workflow, GitLab CI template, CircleCI orb.
- Posts security summary as a PR comment and outputs SARIF for GitHub Code Scanning.

**FR-11: AI Assistant Plugin**
- MCP (Model Context Protocol) server for Claude Code, Cursor, Windsurf.
- Enables closed-loop security: AI generates → VibeGuard scans → AI fixes → VibeGuard approves.

### 6.4 Policy Engine
**FR-12: Configurable Security Policies**
- `.vibeguard.yml` configuration (rule enable/disable, severity override).
- Custom rules: Regex-based pattern matching and AST-based structural matching.

**FR-13: Auto-Remediation**
- Safe auto-fixes for known patterns (e.g., extracting secrets to `.env`, adding parameterized query wrappers).

### 6.5 Dashboard & Reporting
**FR-14: Security Dashboard & AI Code Attribution**
- Web dashboard (issues by severity/time, recurring issues, risk score).
- Track which AI tool generated which code, assigning risk scores per tool.
- Compliance reports (OWASP, SOC 2, audit logs).

---

## 7. Technical Architecture

### 7.1 System Components
```text
  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐
  │  CLI Tool   │  │  GitHub     │  │  Pre-commit Hook        │
  │  (Rust/clap │  │  Action     │  │  (Git hook script)      │
  │   or Node)  │  │  (Docker)   │  │                         │
  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘
         │                │                      │
         └────────────────┼──────────────────────┘
                          ▼
              ┌──────────────────────┐
              │    Core Scanner      │
              │  (Rust/WASM)         │
              │  ┌────────────────┐  │
              │  │ Pattern Match  │  │  ← SecretDetector
              │  │ Engine         │  │  ← SQLInjectionDetector
              │  │                │  │  ← AuthChecker
              │  │ AST Parser     │  │  ← FileHandler
              │  │ (tree-sitter)  │  │  ← CVE Checker
              │  └────────────────┘  │
              └──────────┬───────────┘
                         ▼
              ┌──────────────────────┐
              │    Report Generator  │
              │                      │
              │  • Score Calculator  │
              │  • JSON/SARIF Output │
              │  • Badge Generator   │
              │  • PR Comment Tmpl   │
              └──────────────────────┘
```

### 7.2 Technology Stack
| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Core Scanner** | Rust compiled to WASM | Near-zero latency, runs everywhere (browser, CLI, server), memory safe. |
| **CLI** | Rust (clap) or Node.js/TypeScript | Fast startup, npm distribution reach, large security ecosystem. |
| **VS Code Extension** | TypeScript + LSP | Native VS Code integration, language server for real-time diagnostics. |
| **MCP Server** | TypeScript (MCP SDK) | Native integration with AI assistants. |
| **Dashboard** | Next.js + Tailwind | Modern web app, fast iteration. |
| **Database** | SQLite (local) / PostgreSQL | Simple for individuals, scalable for orgs. |

### 7.3 Pattern Database (v1) Examples
- **Secret Patterns:**
  - AWS Access Key: `AKIA[0-9A-Z]{16}` (CRITICAL)
  - GitHub Token: `ghp_[0-9a-zA-Z]{36}` (CRITICAL)
  - Stripe Key: `sk_live_[0-9a-zA-Z]{24}` (CRITICAL)
- **SQL Injection Patterns:**
  - f-string with SQL keywords: `f"SELECT * FROM {table}"` (CRITICAL)
  - string concat: `"SELECT * FROM " + table` (HIGH)

---

## 8. Competitive Landscape

| Feature | VibeGuard | SonarQube | Semgrep | GitHub Copilot | Trivy |
|---------|-----------|-----------|---------|----------------|-------|
| Real-time pre-commit scanning | ✅ | ❌ (post-commit)| ❌ (CI only) | ❌ | ❌ |
| AI-specific threat detection | ✅ | ❌ | Partial | ❌ | ❌ |
| AI assistant integration (MCP) | ✅ | ❌ | ❌ | ✅ (built-in) | ❌ |
| Auto-remediation | ✅ | Partial | ❌ | Partial | ❌ |
| IDE inline diagnostics | ✅ | ✅ (plugin) | ❌ | ✅ | ❌ |
| Policy customization | ✅ | ✅ | ✅ | ❌ | Limited |
| Free tier | ✅ | ✅ (limited) | ✅ (OSS) | ❌ (paid) | ✅ |
| Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |

**Key Differentiator:** VibeGuard is the **first tool purpose-built for the AI coding workflow** — scanning at the exact point where AI generates code, with AI-aware threat detection and closed-loop self-healing via MCP integration.

---

## 9. Pricing Strategy

| Tier | Price | Includes |
|------|-------|----------|
| **Free (Indie)** | $0/mo | CLI scanning, 100 scans/mo, basic rules, community support. |
| **Pro** | $19/mo/seat | Unlimited scans, IDE extension, auto-remediation, dashboard. |
| **Team** | $49/mo/seat | Pro + team policies, shared rule registry, GitHub/GitLab integration. |
| **Enterprise** | Custom | Self-hosted deployment, SSO/SAML, custom rules, SLA, audit exports. |

---

## 10. Go-to-Market Strategy

| Phase | Timeline | Focus |
|-------|----------|-------|
| **Alpha** | Months 1–2 | Internal testing, core scanner + CLI only. 50 hand-picked beta users. |
| **Beta** | Months 3–4 | VS Code extension, pre-commit hooks, GitHub Action. 500 beta signups. |
| **Launch** | Month 5 | Free tier open to all, Pro tier available. Product Hunt, HN, Twitter launch. |
| **Growth** | Month 6+ | Team/Enterprise tiers, AI assistant plugins, partner integrations. |

---

## 11. Milestones & Roadmap

### MVP (v0.1) — Month 2
- Core scanner engine (Rust/WASM) and 5 languages (JS, TS, Python, Go, Java).
- 20 critical security rules (OWASP Top 10 basics) and Secret detection.
- CLI tool (`scan`, `init`) with text/JSON output and basic scoring.
- `.vibeguard.yml` configuration.

### v0.5 — Month 3
- VS Code extension (inline diagnostics + quick fixes).
- Pre-commit hooks (`vibeguard guard`).
- Auto-remediation for low-risk issues.
- 40+ security rules including AI-specific threat detection (hallucinated imports, prompt injection).

### v1.0 — Month 5
- GitHub Actions integration & PR comments with results.
- Web dashboard (security posture, drill-down).
- README badge generation.
- MCP server for Claude Code / Cursor.
- Comprehensive documentation and npm release.
- Pro + Team pricing tiers.

### v1.5 — Month 8
- JetBrains IDE plugin.
- Custom rule authoring (DSL).
- AI code attribution tracking.
- Self-hosted deployment option & Enterprise tier.

---

## 12. Non-Goals / Out of Scope (v1)
- Full runtime application security monitoring (RASP).
- Penetration testing automation.
- Manual code review replacement (augment, not replace).
- Mobile app security scanning (native iOS/Android).
- Dependency vulnerability and license scanning (focusing instead on real-time AI code logic issues).

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **False positives erode trust** | High | High | Tunable severity, "ignore" mechanism, feedback loop to improve rules. |
| **AI evolves faster than scanner** | Medium | High | Community rule contributions, rapid rule update cycle (weekly). |
| **Performance overhead** | Medium | High | WASM-optimized scanner, < 500ms target, incremental scanning. |
| **Competitor moves fast** | Medium | Medium | First-mover advantage in AI-specific detection, developer UX moat. |
| **Enterprise sales cycle too long**| Medium | Medium | Prove value through free tier adoption, bottom-up sales motion. |

---

## 14. Open Questions

1. **Should the core scanner be fully open-source (MIT) or source-available?** Open-source drives adoption but may limit commercial differentiation.
2. **How do we handle AI tools that embed their own security scanning?** (e.g., GitHub Copilot's built-in filters) — Differentiate through depth and customizability.
3. **What's the right threshold for the free tier?** 100 scans/mo is a starting guess — needs validation with real usage data.
4. **Do we need a cloud-hosted dashboard for free tier users?** Or is CLI output sufficient for individuals?
5. **Should VibeGuard scan AI prompts themselves (not just outputs) for injection risks?** This could be a major differentiator but requires deep AI assistant integration.
6. **Python support timeline and language parsers priority?** Ensure tree-sitter or equivalent handles AST matching consistently across MVP languages.

---

## Appendix: Glossary
| Term | Definition |
|------|------------|
| **Vibe Coding** | AI-assisted development where the developer focuses on intent and the AI handles implementation. |
| **Shift-Left** | Moving security testing earlier in the development lifecycle. |
| **MCP** | Model Context Protocol — standard for AI assistants to interact with external tools. |
| **SARIF** | Static Analysis Results Interchange Format — standard format for security scan results. |
| **Vibe Code Safety Score** | VibeGuard's composite 0-100 security rating metric. |

*This document is a living PRD. It will be updated as user research, beta feedback, and market dynamics evolve.*
