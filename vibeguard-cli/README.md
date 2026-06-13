<div align="center">
  <img src="https://img.shields.io/badge/Security-100%25-brightgreen?style=for-the-badge" alt="Security 100%" />
  <h1>🛡️ VibeGuard CLI</h1>
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

### Step 2: Install Dependencies
Open your Terminal, ensure you are inside this `vibeguard-cli` folder, and type:
```bash
npm install
```

### Step 3: Build the Tool
Convert the code into an executable format by typing:
```bash
npm run build
```

---

## 💻 How to Use VibeGuard

Now that it's built, you can use VibeGuard to scan your projects!

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

## ⚙️ Advanced Configuration

You can customize VibeGuard by running the initialization command:
```bash
node ./dist/cli/index.js init
```
This creates a `.vibeguard.yaml` file where you can choose which detectors to run and customize your strictness!

### Inline Ignores
If VibeGuard flags a line of code that you know is safe (a false positive), you can easily tell it to ignore that line by placing a comment directly above it:
```javascript
// vibeguard-disable-next-line
const mockKey = "AKIAIOSFODNN7ABCDEFG"; 
```

---

## 📊 What Does VibeGuard Actually Look For?

When VibeGuard scans your code, it acts like a security guard looking for critical OWASP vulnerabilities:
1. 🔑 **Exposed Secrets**
2. 🗄️ **Database Risks (SQL Injection)**
3. 🔓 **Missing Authentication**
4. 🤖 **AI Hallucinations**
5. 🕷️ **Cross-Site Scripting (XSS)**
6. 📂 **Path Traversal**

<div align="center">
  <em>Ship code fast — without shipping vulnerabilities.</em>
</div>
