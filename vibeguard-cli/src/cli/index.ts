import { Command } from 'commander';
import { loadConfig, initConfig, ConfigError } from '../utils/config.js';
import { scan } from '../core/scanner.js';
import { formatTextReport, formatJSONReport, formatBadge, printProgress } from '../utils/output.js';
import { Severity, ScoreRating, SCORE_RANGES } from '../types/index.js';
import { SecurityError } from '../utils/files.js';
import { createRequire } from 'module';
import { addHookCommands } from '../commands/hook.js';
import { toSarif } from '../utils/sarif.js';

const require = createRequire(import.meta.url);
// In build mode this might be a bit tricky depending on the outDir, so let's fallback if it fails
let pkg: any = { version: '0.1.0' };
try {
  pkg = require('../../package.json');
} catch (e) {
  // Ignore
}

export const program = new Command();

program
  .name('vibeguard')
  .description('Security scanner for AI-generated code')
  .version(pkg.version);

program
  .command('scan')
  .description('Scan a directory for security issues')
  .argument('[path]', 'Path to scan', '.')
  .option('-o, --output <format>', 'Output format (text, json, sarif)', 'text')
  .option('-s, --severity <level>', 'Minimum severity to report (low, medium, high, critical)')
  .option('-f, --fail-below <score>', 'Fail if score is below threshold')
  .option('-i, --ignore <patterns...>', 'Additional glob patterns to ignore')
  .option('--no-badge', 'Skip badge generation in output')
  .action(async (scanPath, options) => {
    try {
      const overrides: any = {};
      if (options.output) overrides.outputFormat = options.output;
      if (options.severity) overrides.minSeverity = options.severity as Severity;
      if (options.failBelow) overrides.scoreThreshold = parseInt(options.failBelow, 10);
      if (options.ignore) overrides.ignore = options.ignore;
      if (options.badge === false) overrides.showBadge = false;

      const config = await loadConfig(overrides);
      
      const result = await scan({ rootPath: scanPath, config });

      if (config.outputFormat === 'json') {
        console.log(formatJSONReport(result));
      } else if (config.outputFormat === 'sarif') {
        console.log(toSarif(result));
      } else {
        console.log(formatTextReport(result));
        if (config.showBadge) {
          console.log('\nREADME Badge:');
          console.log(formatBadge(result.overallScore, result.rating));
        }
      }

      if (!result.passed) {
        process.exit(5);
      }
      process.exit(0);

    } catch (error: any) {
      if (error instanceof ConfigError) {
        console.error(`⚙️ Config Error: ${error.message}`);
        process.exit(2);
      } else if (error instanceof SecurityError) {
        console.error(`🔒 Security Error: ${error.message}`);
        process.exit(4);
      } else {
        console.error(`💥 Unexpected Error: ${error.message}`);
        if (process.env.DEBUG) console.error(error.stack);
        process.exit(1);
      }
    }
  });

program
  .command('init')
  .description('Initialize VibeGuard configuration')
  .action(async () => {
    try {
      await initConfig(process.cwd());
      console.log('✅ Created .vibeguard.yaml with default settings.');
      console.log('You can now customize it and run `vibeguard scan`.');
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('badge')
  .description('Generate a README badge')
  .requiredOption('--score <number>', 'Manual score')
  .action((options) => {
    const score = parseInt(options.score, 10);
    let rating: ScoreRating = 'critical';
    for (const [r, [min, max]] of Object.entries(SCORE_RANGES)) {
      if (score >= min && score <= max) {
        rating = r as ScoreRating;
        break;
      }
    }
    console.log(formatBadge(score, rating));
  });

addHookCommands(program);

export const runCLI = () => {
  program.parse(process.argv);
};

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  runCLI();
}
