import { exec, cd } from 'shelljs';
import { readdirSync, statSync } from 'fs';
import { resolve } from 'path';

fixtureDirectories(__dirname).forEach(dir => {
  console.log(`Setting up fixture ${dir}`);
  cd(dir);
  exec('yarn install');
  cd(__dirname);
});

function fixtureDirectories(srcpath: string): string[] {
  return readdirSync(srcpath)
    .filter(file => statSync(resolve(srcpath, file)).isDirectory())
    .filter(dir => dir.startsWith('fixture_'));
}
