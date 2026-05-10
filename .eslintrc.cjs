module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
  overrides: [
    {
      // Garde-fou architectural : core/ ne doit RIEN savoir des aventures.
      // Voir docs/ARCHITECTURE.md.
      files: ['src/core/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/adventures/**', '**/adventures', '../adventures*', '../../adventures*'],
                message:
                  "src/core/ ne doit pas importer depuis src/adventures/. Le moteur ne sait rien des aventures.",
              },
            ],
          },
        ],
      },
    },
  ],
};
