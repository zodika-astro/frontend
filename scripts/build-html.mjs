// scripts/build-html.mjs

import fs from 'fs';
import path from 'path';

const root = process.cwd();
const inputFile = path.join(root, 'src', 'templates', 'birth-chart.embed.html');
const outputFile = path.join(root, 'dist', 'birth-chart.embed.html');

const html = fs.readFileSync(inputFile, 'utf8');
fs.writeFileSync(outputFile, html, 'utf8');

console.log(`HTML copied: ${outputFile}`);
