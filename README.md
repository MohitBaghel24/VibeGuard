<div align="center">
  <img src="https://img.shields.io/badge/Security-100%25-brightgreen?style=for-the-badge" alt="Security 100%" />
  <h1>🛡️ VibeGuard (Student Guide)</h1>
  <p><strong>The ultimate safety net for your code.</strong></p>
</div>

---

## 🌟 Welcome to VibeGuard!

Are you a student or a beginner using AI tools like ChatGPT or GitHub Copilot to help you write code? That's awesome! But sometimes, AI can make mistakes. It might accidentally write code that leaves your passwords exposed or makes your database easy to hack.

**VibeGuard** is like an automated spell-checker, but for security! It reads your code and catches these dangerous mistakes *before* anyone can exploit them.

---

## 🚀 Step-by-Step Setup (For Beginners)

Since you have downloaded this project folder, follow these simple steps to get VibeGuard running on your computer.

### Step 1: Install Node.js
If you don't have it already, download and install [Node.js](https://nodejs.org/). This lets your computer run JavaScript tools like VibeGuard.

### Step 2: Open your Terminal
Open your computer's "Terminal" (Mac/Linux) or "Command Prompt" (Windows), and navigate to the `vibeguard-cli` folder inside this project.

```bash
cd vibeguard-cli
```

### Step 3: Install Dependencies
Tell Node.js to download all the necessary parts for VibeGuard by typing:
```bash
npm install
```

### Step 4: Build the Tool
Convert the code into an executable format by typing:
```bash
npm run build
```

---

## 💻 How to Use VibeGuard

Now that it's built, you can use VibeGuard to scan your projects! Make sure you are still in the `vibeguard-cli` folder when you run these commands.

### 1. Scan your project
To scan the current folder for any security risks, type:
```bash
node ./dist/cli/index.js scan .
```
VibeGuard will give you a **Safety Score** from 0 to 100. If you get a 100, you are totally safe! If you get a lower score, it will tell you exactly which file has a problem.

### 2. Automatically Fix Issues
Did VibeGuard find a hardcoded password or secret? It can fix it for you!
```bash
node ./dist/cli/index.js fix .
```

### 3. Dry Run (Practice Fix)
If you want to see what VibeGuard *will* fix without actually changing your files, use a dry run:
```bash
node ./dist/cli/index.js fix . --dry-run
```

---

## 📊 What Does VibeGuard Actually Look For?

When VibeGuard scans your code, it acts like a security guard looking for 4 main things:
1. 🔑 **Exposed Secrets:** (Did you leave an AWS key, Github token, or password directly in your code?)
2. 🗄️ **Database Risks:** (Did you write a SQL query that hackers could manipulate?)
3. 🔓 **Missing Security Doors:** (Did you create an Admin panel but forget to make the user log in first?)
4. 🤖 **AI Hallucinations:** (Did the AI tell you to import a package that doesn't actually exist?)

---

## 📚 For Advanced Users
If you want to dive deeper into how VibeGuard works under the hood, check out our technical documentation:
- [Product Requirements (PRD)](VIBEGUARD_PRD.md)
- [Technical Requirements (TRD)](VIBEGUARD_TRD.md)
- [Application Flow Diagram](APP_FLOW.html)

<div align="center">
  <em>Ship code fast — without shipping vulnerabilities.</em>
</div>
