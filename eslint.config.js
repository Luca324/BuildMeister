import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      'import': importPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      // Рекомендованные правила ESLint
      ...js.configs.recommended.rules,
      
      // Базовые правила форматирования
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'indent': ['error', 'tab'],
      'no-mixed-spaces-and-tabs': 'error',
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'semi': ['error', 'always'],
      'quotes': ['error', 'single', { avoidEscape: true }],
      
      // Правила для неиспользуемых переменных и импортов
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
      
      // Правила сортировки импортов
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // 1. Встроенные модули Node.js
            ['^node:'],
            // 2. Внешние пакеты (npm)
            ['^@?\\w'],
            // 3. Внутренние модули (относительные пути)
            ['^@/', '^~/'],
            // 4. Относительные импорты
            ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
            ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
            // 5. Стили и другие файлы
            ['^.+\\.s?css$'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      
      // Правила для импортов
      'import/no-unresolved': 'error',
      'import/no-duplicates': 'error',
      'import/order': 'off', // Отключаем, так как используем simple-import-sort
    },
  },
];
