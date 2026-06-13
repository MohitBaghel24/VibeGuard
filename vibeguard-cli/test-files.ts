import { discoverFiles } from './src/utils/files.js';

async function test() {
  const config = {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.py', '.json', '.yaml', '.yml', '.env'],
    ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**', '**/.next/**', '**/*.min.js'],
    maxFileSize: 1048576,
    minSeverity: 'low',
    scoreThreshold: 50,
    detectors: {},
    outputFormat: 'text',
    showBadge: true
  } as any;
  const paths = await discoverFiles('/Users/mohitbaghel/Downloads/1st Sem/FIFA copy/ultrafan', config);
  console.log('Total paths:', paths.length);
  const envPaths = paths.filter(p => p.includes('.env'));
  console.log('Env paths:', envPaths);
}

test();
