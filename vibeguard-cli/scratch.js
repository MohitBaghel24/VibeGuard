import { globby } from 'globby';
async function run() {
  const paths = await globby(['**/*.ts', '**/*.js'], {
    cwd: '../',
    ignore: ['**/tests/**', '**/test/**', '**/node_modules/**'],
    absolute: true
  });
  console.log(paths.filter(p => p.includes('tests/')));
}
run();
