import fs from 'node:fs';
import path from 'node:path';
const catalog = JSON.parse(fs.readFileSync('src/data/catalog.json', 'utf8'));
const assets = new Set([
  ...catalog.branches.map((b) => b.cover),
  ...catalog.rooms.flatMap((r) => r.images),
]);
const html = fs.readFileSync('index.html', 'utf8');
for (const [, asset] of html.matchAll(/(?:src|href)="(img\/[^\"]+)"/g)) assets.add(asset);
// Windows accepts incorrect casing; GitHub Pages does not. Compare exact names.
const files = new Set();
function collect(dir, prefix = '') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) collect(path.join(dir, entry.name), name + '/');
    else files.add(name);
  }
}
collect('public');
const missing = [...assets].filter((asset) => !files.has(asset));
if (missing.length) throw new Error('Missing or incorrectly cased assets: ' + missing.join(', '));
console.log(`Verified ${assets.size} local assets (including exact filename casing).`);
