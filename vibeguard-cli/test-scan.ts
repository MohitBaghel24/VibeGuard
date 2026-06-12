import { scan } from './src/core/scanner.js';
import { loadConfig } from './src/utils/config.js';
import path from 'path';

async function run() {
  const rootPath = path.resolve('/Users/mohitbaghel/Desktop/test-project');
  const config = await loadConfig();
  const result = await scan({ rootPath, config });
  console.log("Issues:", result.issues);
}
run();
