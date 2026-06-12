# VibeGuard

🛡️ **VibeGuard** is an automated security gate between AI code generation and production deployment. 

It is designed to scan, validate, and secure AI-generated code (from Claude, Copilot, ChatGPT, etc.) before it enters your codebase, preventing issues like hardcoded secrets, SQL injections, and broken authentication.

## 🚀 Getting Started

The main CLI tool is located in the `vibeguard-cli` directory.

To use VibeGuard:

```bash
cd vibeguard-cli
npm install
npm run build
npm link
```

Then you can scan any project using:
```bash
vibeguard scan /path/to/your/project
```

## 📚 Documentation
- [Product Requirements (PRD)](VIBEGUARD_PRD.md)
- [Technical Requirements (TRD)](VIBEGUARD_TRD.md)
- [Application Flow Diagram](APP_FLOW.html)

---
*Ship AI code fast — without shipping vulnerabilities.*
