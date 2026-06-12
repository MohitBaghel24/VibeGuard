import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { installHook, uninstallHook, HOOK_SCRIPT } from '../../src/utils/hooks.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Git Hooks', () => {
  let tmpDir: string;
  let hooksDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vibeguard-hooks-'));
    hooksDir = path.join(tmpDir, '.git', 'hooks');
    await fs.mkdir(hooksDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('installs the hook correctly', async () => {
    await installHook(hooksDir);
    const hookPath = path.join(hooksDir, 'pre-commit');
    const content = await fs.readFile(hookPath, 'utf8');
    expect(content).toBe(HOOK_SCRIPT);
    
    const stats = await fs.stat(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
  });

  it('uninstalls the hook correctly', async () => {
    await installHook(hooksDir);
    await uninstallHook(hooksDir);
    
    const hookPath = path.join(hooksDir, 'pre-commit');
    await expect(fs.stat(hookPath)).rejects.toThrow();
  });

  it('throws when uninstalling non-vibeguard hook', async () => {
    const hookPath = path.join(hooksDir, 'pre-commit');
    await fs.writeFile(hookPath, '#!/bin/sh\necho "Other hook"\n');
    
    await expect(uninstallHook(hooksDir)).rejects.toThrow('Existing pre-commit hook is not managed by VibeGuard.');
  });
});
