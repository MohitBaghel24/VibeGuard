<div align="center">
  <img src="https://img.shields.io/badge/Security-100%25-brightgreen?style=for-the-badge" alt="Security 100%" />
  <h1>🛡️ VibeGuard</h1>
  <p><strong>The ultimate safety net for your AI-generated code.</strong></p>
</div>

---

## 🌟 What is VibeGuard?

AI coding assistants (like ChatGPT, Claude, and GitHub Copilot) are incredible tools that help us build software faster. But sometimes, they make mistakes. They might accidentally generate code that contains **hardcoded passwords**, **database vulnerabilities**, or **unsecured administrative routes**.

**VibeGuard** is your automated security guard. 

It is a simple, ultra-fast tool that scans your project and catches these AI-generated mistakes *before* they ever reach your users. 

Think of it like a spell-checker, but instead of checking for bad grammar, it checks for bad security!

---

## 💡 Why do you need it?

If you are a founder, a non-technical manager, or a solo developer using AI to write code, it can be hard to know if the code is truly safe. 

VibeGuard gives you peace of mind by acting as an automatic reviewer. It looks for:
- 🔑 **Exposed Secrets:** (Did the AI leave an AWS key, Supabase key, or Stripe password in the code?)
- 🗄️ **Database Risks:** (Did the AI write a SQL query that hackers could easily exploit?)
- 🔓 **Missing Security Doors:** (Did the AI create an Admin panel but forget to add a login requirement?)

If it finds anything dangerous, it stops you and tells you exactly where the problem is.

---

## 🚀 How to use it (It's super easy!)

You don't need to be a security expert to use VibeGuard. If you have a terminal open in your project folder, just type one command:

```bash
npx vibeguard scan .
```

That's it! VibeGuard will instantly scan your files and give your project a **Vibe Code Safety Score** from 0 to 100. 

### Want to install it permanently?
If you want to keep the tool installed on your computer, run:
```bash
npm install -g vibeguard
```
vibeguard scan .
```

---

## 📊 Understanding the Report

When you run VibeGuard, it gives you a beautiful, easy-to-read report:

- **🟢 Excellent (100/100):** Your code looks clean! No obvious AI security mistakes found.
- **🟡 Good (70-99/100):** A few minor issues, but nothing critical. 
- **🔴 Poor / Critical (0-69/100):** VibeGuard found something dangerous (like an exposed password) and failed the scan to protect you. It will show you exactly which file and line to fix!

---

## 📚 For Developers

If you want to dive deeper into how VibeGuard works under the hood, or if you want to integrate it into your automated CI/CD pipelines (like GitHub Actions), check out our technical documentation:

- [Product Requirements (PRD)](VIBEGUARD_PRD.md)
- [Technical Requirements (TRD)](VIBEGUARD_TRD.md)
- [Application Flow Diagram](APP_FLOW.html)
- [CLI Source Code & Advanced Usage](vibeguard-cli/README.md)

---
<div align="center">
  <em>Ship AI code fast — without shipping vulnerabilities.</em>
</div>
