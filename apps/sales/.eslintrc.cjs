module.exports = {
  root: true,
  extends: [require.resolve('@pe/config/eslint/next.cjs')],
  ignorePatterns: ['.next', 'node_modules'],
  parserOptions: {
    tsconfigRootDir: __dirname,
  },
};
