import { FlatCompat } from '@eslint/eslintrc';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends('next/core-web-vitals'),
  ...compat.extends('next/typescript'),

  // Lock-in: components must not branch on theme/numpadLayout literals.
  // The model layer (src/lib/sudoku-model.ts) is the only place these
  // string literals may appear in equality comparisons; everywhere
  // else, structure flows through data attributes and contract entries.
  // See docs/ARCHITECTURE.md.
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "BinaryExpression[operator=/^={2,3}$/][left.name='theme'][right.type='Literal']",
          message:
            "Direct `theme === '<literal>'` branches are forbidden outside src/lib/sudoku-model.ts. Use data attributes (data-theme tokens, data-modal-style) or CSS custom properties for theme-conditional behavior. See docs/ARCHITECTURE.md.",
        },
        {
          selector:
            "BinaryExpression[operator=/^={2,3}$/][left.name='numpadLayout'][right.type='Literal']",
          message:
            "Direct `numpadLayout === '<literal>'` branches are forbidden outside src/lib/sudoku-model.ts and the render-branch in PlayClient.tsx. Use the NumpadContract or data attributes.",
        },
      ],
    },
  },
  {
    files: ['src/lib/sudoku-model.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  {
    ignores: [
      '.next/**',
      'out/**',
      'build/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
    ],
  },
];

export default config;
