# VibeGuard

🛡️ **VibeGuard** is an automated security gate between AI code generation and production deployment. 

It is designed to scan, validate, and secure AI-generated code (from Claude, Copilot, ChatGPT, etc.) before it enters your codebase, preventing issues like hardcoded secrets, SQL injections, and broken authentication.

## 🚀 Getting Started

To instantly scan your project using the official NPM package:

```bash
npx vibeguard-scan scan .
```

You can also install it globally:
```bash
npm install -g vibeguard-scan
vibeguard-scan scan /path/to/your/project
```

For development and local building, check out the `vibeguard-cli` directory.

## 📚 Documentation
- [Product Requirements (PRD)](VIBEGUARD_PRD.md)
- [Technical Requirements (TRD)](VIBEGUARD_TRD.md)
- [Application Flow Diagram](APP_FLOW.html)

---
*Ship AI code fast — without shipping vulnerabilities.*
