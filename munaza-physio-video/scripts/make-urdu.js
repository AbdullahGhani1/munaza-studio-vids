// Generates ur/index.html: the same composition with the Urdu caption track enabled.
// Run with: npm run build:ur
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const out = src.replace('<html lang="en">', '<html lang="ur" data-lang="ur">');

if (out === src) {
  throw new Error('Could not find <html lang="en"> in index.html');
}

fs.mkdirSync(path.join(root, 'ur'), { recursive: true });
fs.writeFileSync(path.join(root, 'ur', 'index.html'), out);
console.log('Wrote ur/index.html');
