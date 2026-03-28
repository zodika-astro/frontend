import { build } from 'esbuild';

await build({
  entryPoints: ['src/bundles/birth-chart.bundle.js'],
  bundle: true,
  outfile: 'dist/birth-chart.bundle.js',
  format: 'iife',
  platform: 'browser',
  target: ['es2018'],
  minify: false,
  sourcemap: false,
  logLevel: 'info',
});
