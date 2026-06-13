import ts from 'typescript';
import crypto from 'crypto';
import { Issue, Severity } from '../../types/index.js';

const TAINTED_SOURCES = ['req.body', 'req.query', 'req.params', 'process.argv', 'ctx.request.body', 'ctx.query'];
const SQL_SINKS = ['query', 'execute', 'raw', 'queryAsync', 'executeAsync'];
const CMD_SINKS = ['exec', 'spawn', 'execSync', 'spawnSync'];
const SSRF_SINKS = ['fetch', 'axios.get', 'axios.post', 'request', 'http.get', 'https.get'];

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

export function analyzeFileForTaint(filePath: string, content: string): Issue[] {
  // Fast Path: Only run AST parser if file contains a sink keyword
  const fastSinkRegex = /query|execute|raw|exec|spawn|fetch|axios|request|http\.get/i;
  if (!fastSinkRegex.test(content)) return [];

  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const taintedVariables = new Set<string>();
  const issues: Issue[] = [];

  function isTaintedExpression(node: ts.Expression): boolean {
    if (ts.isPropertyAccessExpression(node)) {
      const text = node.getText(sourceFile);
      if (TAINTED_SOURCES.some(source => text.startsWith(source))) return true;
      if (isTaintedExpression(node.expression)) return true;
    }
    if (ts.isIdentifier(node)) {
      return taintedVariables.has(node.text);
    }
    if (ts.isBinaryExpression(node)) {
      return isTaintedExpression(node.left) || isTaintedExpression(node.right);
    }
    if (ts.isTemplateExpression(node)) {
      return node.templateSpans.some(span => isTaintedExpression(span.expression));
    }
    if (ts.isCallExpression(node)) {
      return node.arguments.some(arg => isTaintedExpression(arg));
    }
    return false;
  }

  function visit(node: ts.Node) {
    // Variable Declarations (const id = req.query.id, or const { url } = req.body)
    if (ts.isVariableDeclaration(node) && node.name && node.initializer) {
      if (isTaintedExpression(node.initializer)) {
        if (ts.isIdentifier(node.name)) {
          taintedVariables.add(node.name.text);
        } else if (ts.isObjectBindingPattern(node.name)) {
          node.name.elements.forEach(el => {
            if (ts.isIdentifier(el.name)) {
              taintedVariables.add(el.name.text);
            }
          });
        }
      }
    }
    
    // Assignments (id = req.query.id)
    if (ts.isExpressionStatement(node) && ts.isBinaryExpression(node.expression)) {
      const binExp = node.expression;
      if (binExp.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(binExp.left)) {
        if (isTaintedExpression(binExp.right)) {
          taintedVariables.add(binExp.left.text);
        } else {
          taintedVariables.delete(binExp.left.text); // Cleared taint
        }
      }
    }

    // Check Sinks (db.query(id))
    if (ts.isCallExpression(node)) {
      let functionName = '';
      if (ts.isPropertyAccessExpression(node.expression)) {
        functionName = node.expression.name.text;
      } else if (ts.isIdentifier(node.expression)) {
        functionName = node.expression.text;
      }

      if (functionName) {
        let isSql = SQL_SINKS.includes(functionName);
        let isCmd = CMD_SINKS.includes(functionName);
        let isSsrf = SSRF_SINKS.includes(functionName);

        if (isSql || isCmd || isSsrf) {
          // Check if any argument is tainted
          const isVulnerable = node.arguments.some(arg => isTaintedExpression(arg));
          if (isVulnerable) {
            const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
            const lineNumber = pos.line + 1;
            
            const lineStart = content.lastIndexOf('\n', node.getStart(sourceFile) - 1) + 1;
            let lineEnd = content.indexOf('\n', node.getStart(sourceFile));
            if (lineEnd === -1) lineEnd = content.length;
            const lineContent = content.substring(lineStart, lineEnd);

            let type = 'SQL Injection';
            let ruleId = 'ast:sql-taint';
            let detectorId = 'sql';
            if (isCmd) { type = 'Command Injection'; ruleId = 'ast:cmd-taint'; detectorId = 'cmdInjection'; }
            if (isSsrf) { type = 'SSRF'; ruleId = 'ast:ssrf-taint'; detectorId = 'ssrf'; }

            issues.push({
              id: `ast:${hash(`${filePath}:${lineNumber}:${node.getStart(sourceFile)}`)}`,
              detectorId: detectorId,
              ruleId: ruleId,
              title: `${type} via AST Taint Flow`,
              description: `A tainted variable originating from user input was traced directly into a sensitive ${functionName}() sink.`,
              severity: Severity.CRITICAL,
              filePath,
              line: lineNumber,
              column: pos.character + 1,
              length: node.getWidth(sourceFile),
              match: node.getText(sourceFile).split('\n')[0],
              lineContent,
              confidence: 0.95,
              cwe: isSql ? 'CWE-89' : (isCmd ? 'CWE-78' : 'CWE-918')
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}
