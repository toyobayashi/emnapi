const sharedRules = {
  'spaced-comment': 'off',
  'no-new-func': 'off',
  'no-implied-eval': 'off',
  'no-var': 'off'
}

module.exports = {
  root: true,
  env: {
    node: true,
    browser: true
  },
  extends: [
    'standard'
  ],
  rules: {
    ...sharedRules
  },
  globals: {
    emnapi: false,
    __VERSION__: false
  },
  overrides: [
    {
      files: [
        './packages/**/*.ts'
      ],
      parser: '@typescript-eslint/parser',
      extends: [
        'standard-with-typescript'
      ],
      rules: {
        ...sharedRules,
        '@typescript-eslint/no-implied-eval': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
        '@typescript-eslint/no-unused-vars': 'error',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/promise-function-async': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/consistent-type-definitions': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/no-dynamic-delete': 'off',
        '@typescript-eslint/method-signature-style': 'off',
        '@typescript-eslint/prefer-includes': 'off',
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/ban-types': 'off',
        '@typescript-eslint/consistent-type-imports': 'off',
        '@typescript-eslint/consistent-generic-constructors': 'off',
        '@typescript-eslint/no-unnecessary-type-assertion': 'off',
        '@typescript-eslint/no-unsafe-argument': 'off',
        '@typescript-eslint/unbound-method': 'off',
        '@typescript-eslint/member-delimiter-style': ['error', {
          multiline: {
            delimiter: 'none',
            requireLast: true
          },
          singleline: {
            delimiter: 'semi',
            requireLast: false
          }
        }]
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        createDefaultProgram: true
      },
    }
  ]
}
