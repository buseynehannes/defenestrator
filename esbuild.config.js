const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

const commonOptions = {
  platform: 'browser',
  target: 'es2022',
  format: 'esm',
  sourcemap: true,
  logLevel: 'info',
  loader: {
    '.js': 'js'
  }
};

const entryPoints = {
  background: './src/background.ts',
  options: './src/options.ts'
};

const buildOptions = {
  ...commonOptions,
  entryPoints,
  outdir: './dist',
  bundle: true,
  splitting: false,
  external: [] // webextension-polyfill is loaded globally
};

if (isWatch) {
  esbuild.context(buildOptions).then(ctx => {
    ctx.watch().then(() => {
      console.log('esbuild is watching for changes...');
    });
  });
} else {
  esbuild.build(buildOptions).catch(() => process.exit(1));
}

