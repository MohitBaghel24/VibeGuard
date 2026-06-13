import { Issue, Severity } from '../../types/index.js';
import crypto from 'crypto';
import { Detector } from './secrets.js';
import { builtinModules } from 'module';
import path from 'path';
import { promises as fs } from 'fs';

function hash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex').substring(0, 8);
}

// A simple cache to avoid parsing package.json on every file
let knownPackages: Set<string> | null = null;

async function loadKnownPackages(rootPath: string): Promise<Set<string>> {
  if (knownPackages) return knownPackages;
  
  const pkgs = new Set<string>(builtinModules);
  // Add node: prefixed built-ins
  for (const mod of builtinModules) {
    pkgs.add(`node:${mod}`);
  }

  try {
    const pkgPath = path.resolve(rootPath, 'package.json');
    const content = await fs.readFile(pkgPath, 'utf8');
    const pkgJson = JSON.parse(content);
    
    if (pkgJson.dependencies) Object.keys(pkgJson.dependencies).forEach(d => pkgs.add(d));
    if (pkgJson.devDependencies) Object.keys(pkgJson.devDependencies).forEach(d => pkgs.add(d));
    if (pkgJson.peerDependencies) Object.keys(pkgJson.peerDependencies).forEach(d => pkgs.add(d));
  } catch (e) {
    // Ignore error if no package.json
  }
  
  knownPackages = pkgs;
  return pkgs;
}

export class AIHallucinationDetector implements Detector {
  readonly id = 'hallucinations';
  readonly name = 'AI Hallucinated Imports Detector';
  readonly supportedExtensions = ['.js', '.ts', '.jsx', '.tsx'];

  async initialize(rootPath: string) {
    await loadKnownPackages(rootPath);
  }

  detect(filePath: string, content: string): Issue[] {
    const issues: Issue[] = [];
    if (!knownPackages) return issues; // Skip if initialization failed or not called
    
    // Regex matches: import 'pkg', import x from 'pkg', require('pkg')
    // and correctly isolates the package name, ignoring local paths starting with . or /
    const importRegex = /(?:import\s+(?:[\s\S]*?from\s+)?|require\s*\(\s*)(["'])([^"'\.\/][^"']+)\1/g;
    
    const getLineNumber = (index: number) => {
      let count = 1;
      for (let i = 0; i < index; i++) {
        if (content[i] === '\n') count++;
      }
      return count;
    };

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      let pkgName = match[2];
      
      // Handle subpaths (e.g. 'lodash/cloneDeep' -> 'lodash', or '@types/node' -> '@types/node')
      if (pkgName.startsWith('@')) {
        const parts = pkgName.split('/');
        if (parts.length > 2) {
          pkgName = `${parts[0]}/${parts[1]}`;
        }
      } else {
        pkgName = pkgName.split('/')[0];
      }

      if (!knownPackages.has(pkgName)) {
        const lineNumber = getLineNumber(match.index);
        const lineStart = content.lastIndexOf('\n', match.index - 1) + 1;
        let lineEnd = content.indexOf('\n', match.index);
        if (lineEnd === -1) lineEnd = content.length;
        
        issues.push({
          id: `hallucination:${hash(`${filePath}:${lineNumber}:${pkgName}`)}`,
          detectorId: this.id,
          title: `AI Hallucination: Unknown Package '${pkgName}'`,
          description: `The imported package '${pkgName}' is not defined in package.json and is not a Node.js built-in. AI models frequently hallucinate non-existent packages.`,
          severity: Severity.HIGH,
          filePath,
          line: lineNumber,
          column: match.index - lineStart + 1,
          length: fullMatch.length,
          match: fullMatch,
          lineContent: content.substring(lineStart, lineEnd),
          confidence: 0.9,
          fix: 'Install the missing package or replace it with a valid alternative.',
        });
      }
    }
    
    return issues;
  }
}
