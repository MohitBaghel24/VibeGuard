import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import { loadConfig, ConfigError } from '../utils/config.js';
import { scan } from '../core/scanner.js';
import { promises as fs } from 'fs';
import path from 'path';
import chalk from 'chalk';

export function addFixCommands(program: Command) {
  program
    .command('fix')
    .description('Automatically fix simple security issues')
    .argument('[path]', 'Path to scan and fix', '.')
    .option('--dry-run', 'Show diffs without actually modifying files')
    .action(async (scanPath, options) => {
      try {
        const config = await loadConfig();
        console.log(chalk.blue(`🛡️ Scanning for fixable issues in ${scanPath}...`));
        
        const result = await scan({ rootPath: scanPath, config });
        
        const fixableIssues = result.issues.filter(issue => issue.replacement !== undefined);
        
        if (fixableIssues.length === 0) {
          console.log(chalk.green('\n✅ No auto-fixable issues found!'));
          process.exit(0);
        }

        console.log(chalk.yellow(`\n🔧 Found ${fixableIssues.length} fixable issue(s).\n`));

        // Group by file
        const issuesByFile = new Map<string, typeof fixableIssues>();
        for (const issue of fixableIssues) {
          if (!issuesByFile.has(issue.filePath)) issuesByFile.set(issue.filePath, []);
          issuesByFile.get(issue.filePath)!.push(issue);
        }

        for (const [filePath, fileIssues] of issuesByFile.entries()) {
          const absPath = path.resolve(scanPath, filePath);
          let content = await fs.readFile(absPath, 'utf8');
          
          console.log(chalk.cyan(`📄 ${filePath}:`));
          
          // Sort by index descending to safely replace without breaking offsets
          const sortedIssues = [...fileIssues].sort((a, b) => b.column - a.column);
          
          for (const issue of sortedIssues) {
            const target = issue.rawMatch || issue.match;
            
            if (options.dryRun) {
              console.log(`  - Previewing fix for [${issue.title}] at line ${issue.line}`);
              console.log(chalk.red(`    - ${target}`));
              console.log(chalk.green(`    + ${issue.replacement}`));
            } else {
              // Interactive prompt
              const userReplacement = await input({
                message: `⚠️ [${issue.title}] found at line ${issue.line}. What environment variable should replace this?`,
                default: issue.replacement,
              });
              
              content = content.replace(target, userReplacement);
            }
          }
          
          if (!options.dryRun) {
            await fs.writeFile(absPath, content, 'utf8');
            console.log(chalk.green(`  ✅ Saved fixes to ${filePath}\n`));
          } else {
            console.log();
          }
        }
        
        if (options.dryRun) {
          console.log(chalk.yellow('⚠️ This was a dry run. No files were actually modified. Run without --dry-run to apply fixes.'));
        } else {
          console.log(chalk.green('🎉 All fixes applied successfully!'));
        }

      } catch (error: any) {
        if (error instanceof ConfigError) {
          console.error(`⚙️ Config Error: ${error.message}`);
        } else {
          console.error(`💥 Unexpected Error: ${error.message}`);
        }
        process.exit(1);
      }
    });
}
