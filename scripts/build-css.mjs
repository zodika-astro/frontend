import fs from 'fs';
import path from 'path';

const root = process.cwd();
const outputFile = path.join(root, 'dist', 'birth-chart.bundle.css');

const files = [
  'src/styles/base.css',
  'src/styles/form.css',
  'src/styles/components.css',
  'src/styles/overlays.css',
  'src/styles/integrations.css',
];

const content = files
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n\n');

fs.writeFileSync(outputFile, content, 'utf8');
console.log(`CSS bundle created: ${outputFile}`);
