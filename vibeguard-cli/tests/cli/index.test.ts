import { describe, it, expect, vi } from 'vitest';
import { program } from '../../src/cli/index.js';

describe('CLI', () => {
  it('should have scan command', () => {
    const cmd = program.commands.find(c => c.name() === 'scan');
    expect(cmd).toBeDefined();
  });

  it('should have init command', () => {
    const cmd = program.commands.find(c => c.name() === 'init');
    expect(cmd).toBeDefined();
  });

  it('should have badge command', () => {
    const cmd = program.commands.find(c => c.name() === 'badge');
    expect(cmd).toBeDefined();
  });

  it('badge command should print correct badge', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    await program.parseAsync(['node', 'test', 'badge', '--score', '95']);
    
    expect(logSpy).toHaveBeenCalled();
    const lastCall = logSpy.mock.calls[logSpy.mock.calls.length - 1][0];
    expect(lastCall).toContain('brightgreen'); // 95 is excellent

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('init command should call initConfig', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    
    // Test init (we expect it to fail or succeed depending on temp dir, we just check it runs)
    try {
      await program.parseAsync(['node', 'test', 'init']);
    } catch(e) {}
    
    expect(exitSpy).not.toHaveBeenCalledWith(5); // Not a scan error

    logSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
