module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['dist/', 'node_modules/'],
  rules: {
    // Existing code types Neo4j records and Gemini replies as `any`: report it without failing
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allows the Express Request augmentation in middleware/authMiddleware.ts
    '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    // Express error handlers must declare all four parameters, used or not
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
