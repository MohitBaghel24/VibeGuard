import { scanProject } from './src/core/scanner.js';
import { loadConfig } from './src/utils/config.js';

async function test() {
  const config = await loadConfig();
  const report = await scanProject('/Users/mohitbaghel/Downloads/1st Sem/FIFA copy/ultrafan', config);
  const envIssues = report.issues.filter(i => i.filePath.includes('.env'));
  console.log('Issues found in env files:', envIssues.length);
  envIssues.forEach(i => console.log(i.title, i.filePath));
}

test();
