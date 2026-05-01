import { defineConfig } from 'tsup';
export default defineConfig([
  { entry: { index: 'src/index.ts' }, format: ['esm'], dts: true, clean: true, target: 'node22', sourcemap: true, outExtension: () => ({ js: '.mjs', dts: '.d.mts' }) },
  { entry: { cli: 'src/cli.ts' }, format: ['esm'], target: 'node22', sourcemap: true, outExtension: () => ({ js: '.mjs' }) },
]);
