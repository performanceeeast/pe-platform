/** Shared ESLint config for Next.js apps in the PE platform monorepo. */
module.exports = {
  extends: [
    'next/core-web-vitals',
    'next/typescript',
    'prettier',
  ],
  rules: {
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'react/no-unescaped-entities': 'off',
  },
  ignorePatterns: ['node_modules', '.next', 'dist', 'build', 'out'],
};
