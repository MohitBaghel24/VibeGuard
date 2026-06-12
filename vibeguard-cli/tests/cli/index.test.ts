import { describe, it, expect } from 'vitest';
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
});
