import { promises as fs } from 'fs';
import path from 'path';
import { globby } from 'globby';
import { VibeGuardConfig } from '../types/index.js';

export class SecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

export function isBinary(buffer: Buffer): boolean {
  for (let i = 0; i < Math.min(buffer.length, 8192); i++) {
    if (buffer[i] === 0x00) {
      return true;
    }
  }
  return false;
}

export function sanitizeFilePath(userPath: string, rootPath: string): string {
  const resolvedPath = path.resolve(rootPath, userPath);
  if (!resolvedPath.startsWith(path.resolve(rootPath))) {
    throw new SecurityError(`Path traversal detected: ${userPath}`);
  }
  return resolvedPath;
}

export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    let fd;
    try {
      fd = await fs.open(filePath, 'r');
      const buffer = Buffer.alloc(8192);
      const { bytesRead } = await fd.read(buffer, 0, 8192, 0);
      if (isBinary(buffer.subarray(0, bytesRead))) {
        return null;
      }
    } finally {
      if (fd) await fd.close();
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    if (lines.length > 10000) {
      return null;
    }
    
    for (const line of lines) {
      if (line.length > 2000) {
        return null;
      }
    }
    
    return content;
  } catch (error) {
    return null;
  }
}

export async function discoverFiles(rootPath: string, config: VibeGuardConfig): Promise<string[]> {
  const absoluteRoot = path.resolve(rootPath);
  
  let gitignorePatterns: string[] = [];
  try {
    const gitignoreContent = await fs.readFile(path.join(absoluteRoot, '.gitignore'), 'utf-8');
    gitignorePatterns = gitignoreContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    // Ignore if .gitignore does not exist
  }

  const ignorePatterns = [...config.ignore, ...gitignorePatterns];
  const searchPatterns = config.extensions.map(ext => `**/*${ext}`);

  const paths = await globby(searchPatterns, {
    cwd: absoluteRoot,
    ignore: ignorePatterns,
    absolute: true,
    dot: true,
    gitignore: true, // globby also supports native gitignore parsing
  });

  const validPaths: string[] = [];

  for (const p of paths) {
    try {
      const sanitizedPath = sanitizeFilePath(p, absoluteRoot);
      const stats = await fs.stat(sanitizedPath);
      
      if (stats.size > config.maxFileSize) {
        continue;
      }
      
      validPaths.push(path.relative(absoluteRoot, sanitizedPath));
    } catch (e) {
      // ignore access issues
    }
  }

  return validPaths;
}
