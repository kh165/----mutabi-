import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
export default [
  { ignores: ['dist/**', 'node_modules/**', 'public/**', 'functions/lib/**', 'tests/**'] },
  js.configs.recommended,
  { files: ['**/*.{js,jsx,mjs,cjs}'], languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.browser, ...globals.node } }, settings: { react: { version: 'detect' } }, plugins: { react, 'react-hooks': reactHooks }, rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'no-undef': 'error', 'react/jsx-uses-react': 'off', 'react/jsx-uses-vars': 'error', 'no-empty': 'off', 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' } },
];
