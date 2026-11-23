import tsParser from '@typescript-eslint/parser';
import { motionPlugin } from './scripts/eslint-motion-rules.js';

export default [
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      motion: motionPlugin,
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
      'no-empty': 'warn',
      'motion/no-transition-none': 'error',
      'motion/no-raw-durations': 'warn',
    },
  },
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.js', '*.js', '*.ts'],
    ignores: ['src/**'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  {
    ignores: [
      'dist/**',
      'dist-server/**',
      'build/**',
      'node_modules/**',
      '*.tsbuildinfo',
      '**/*.d.ts',
      'playwright-report/**',
      'test-results/**',
    ],
  },
];
