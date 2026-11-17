import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const dist = join(process.cwd(), 'dist');
const html = await readFile(join(dist, 'index.html'), 'utf8');
assert.match(html, /CascadeLens — CSS Cascade Debugger/, 'production title is present');
assert.match(html, /rel="canonical"/, 'canonical URL is present');
assert.match(html, /og:image/, 'social image metadata is present');

const localAssets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
  .map(match => match[1])
  .filter(value => value.startsWith('/cascade-lens/'))
  .map(value => value.replace(/^\/cascade-lens\//, ''));
assert.ok(localAssets.some(value => value.endsWith('.js')), 'a production JavaScript bundle is referenced');
assert.ok(localAssets.some(value => value.endsWith('.css')), 'a production stylesheet is referenced');
for (const asset of localAssets) {
  await access(join(dist, asset));
}

for (const asset of ['favicon.svg', 'og-image.svg', 'robots.txt', 'sitemap.xml', '404.html', 'privacy.html']) {
  await access(join(dist, asset));
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(path));
    else files.push(path);
  }
  return files;
}
const builtText = await Promise.all((await collectFiles(dist))
  .filter(path => /\.(?:js|css|html)$/.test(path))
  .map(path => readFile(path, 'utf8')));
assert.ok(!builtText.some(content => content.includes('fonts.googleapis.com')), 'the build has no remote font dependency');
console.log(`Smoke check passed: ${localAssets.length} local HTML asset references and 4 public metadata assets verified.`);
