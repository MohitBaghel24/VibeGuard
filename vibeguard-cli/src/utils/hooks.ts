import { promises as fs } from 'fs';
import path from 'path';

export const HOOK_SCRIPT = `#!/bin/sh
# VibeGuard pre-commit hook
echo "🛡️ Running VibeGuard security scan..."
npx vibeguard-scan scan --fail-below 80
if [ $? -ne 0 ]; then
  echo "❌ VibeGuard scan failed. Please fix the security issues before committing."
  exit 1
fi
`;

export async function installHook(gitHooksPath?: string): Promise<void> {
  const rootDir = process.cwd();
  const hooksDir = gitHooksPath || path.join(rootDir, '.git', 'hooks');
  
  try {
    const stats = await fs.stat(hooksDir);
    if (!stats.isDirectory()) {
      throw new Error('.git/hooks is not a directory');
    }
  } catch (e: any) {
    throw new Error('Could not find .git/hooks directory. Are you in the root of a git repository?', { cause: e });
  }

  const hookPath = path.join(hooksDir, 'pre-commit');
  await fs.writeFile(hookPath, HOOK_SCRIPT, { mode: 0o755 });
}

export async function uninstallHook(gitHooksPath?: string): Promise<void> {
  const rootDir = process.cwd();
  const hooksDir = gitHooksPath || path.join(rootDir, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'pre-commit');
  
  try {
    const content = await fs.readFile(hookPath, 'utf8');
    if (content.includes('VibeGuard pre-commit hook')) {
      await fs.unlink(hookPath);
    } else {
      throw new Error('Existing pre-commit hook is not managed by VibeGuard.');
    }
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      throw new Error('No pre-commit hook found.', { cause: e });
    }
    throw e;
  }
}
