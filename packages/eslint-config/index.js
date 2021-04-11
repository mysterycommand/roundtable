module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  env: {
    es2021: true,
  },
  rules: {
    '@typescript-eslint/ban-ts-comment': 'off',
  },
  overrides: [
    {
      files: ['snowpack.config.cjs'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
  ],
};
