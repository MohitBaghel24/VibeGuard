import { Command } from 'commander';
import { installHook, uninstallHook } from '../utils/hooks.js';

export function addHookCommands(program: Command) {
  const hookCmd = program
    .command('hook')
    .description('Manage git pre-commit hooks');

  hookCmd
    .command('install')
    .description('Install VibeGuard pre-commit hook')
    .action(async () => {
      try {
        await installHook();
        console.log('✅ VibeGuard pre-commit hook installed successfully.');
      } catch (e: any) {
        console.error(`❌ Failed to install hook: ${e.message}`);
        process.exit(1);
      }
    });

  hookCmd
    .command('uninstall')
    .description('Uninstall VibeGuard pre-commit hook')
    .action(async () => {
      try {
        await uninstallHook();
        console.log('✅ VibeGuard pre-commit hook uninstalled successfully.');
      } catch (e: any) {
        console.error(`❌ Failed to uninstall hook: ${e.message}`);
        process.exit(1);
      }
    });
}
