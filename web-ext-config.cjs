// web-ext configuration
module.exports = {
  ignoreFiles: [
    'coverage/**',
    'node_modules/**',
    '*.md',
    '*.iml',
    'tsconfig.json',
    'vitest.config.ts',
    'package.json',
    'package-lock.json',
    'src/**/*.ts',
    'src/**/*.test.ts',
    'dist/**/*.d.ts',
    'dist/**/*.d.ts.map',
    'dist/**/*.js.map',
    'dist/**/*.test.js',
    'verify-extension.sh',
    'validate.sh',
  ],
  lint: {
    output: 'text',
  },
};

