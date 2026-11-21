import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import autoImport from './.eslintrc-auto-import.json' with { type: 'json' };

export default defineConfig([
  {
    ignores: ['dist/**', 'auto-imports.d.ts', 'components.d.ts'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: { globals: autoImport.globals },
  },
  {
    files: ['*.{js,ts,mjs}', 'src/**/test/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
]);
