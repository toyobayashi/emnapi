import eslint from '@eslint/js'
import neostandard from 'neostandard'

export default [
  {
    ignores: [
      '**/node_modules',
      '**/{dist,lib,out}',
      '**/CMakeFiles',
      '**/.build',
      '**/test',
      'packages/core/src/emnapi'
    ]
  },
  eslint.configs.recommended,
  ...neostandard(),
  {
    rules: {
      'prefer-const': 'off',
      'spaced-comment': 'off',
      'no-new-func': 'off',
      'no-implied-eval': 'off',
      'no-var': 'off',
      camelcase: 'off',
      'no-throw-literal': 'off',
      'prefer-rest-params': 'off',
      'prefer-spread': 'off',
      'no-unused-vars': ['error', {
        args: 'all',
        argsIgnorePattern: '^_',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }],
      '@stylistic/member-delimiter-style': ['error', {
        multiline: {
          delimiter: 'none',
          requireLast: true
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false
        }
      }],
      '@stylistic/spaced-comment': ['error', 'always', {
        line: {
          markers: ['/', '#region', '#endregion'],
        },
        block: {
          markers: ['#__PURE__'],
        },
      }]
    }
  },
  {
    files: ['packages/emnapi/**'],
    rules: {
      'no-unused-vars': 'off',
    }
  }
]
