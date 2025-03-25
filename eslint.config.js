import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import neostandard from 'neostandard'

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  ...neostandard({ ts: true }),
  {
    ignores: [
      'packages/*/{dist,lib,out}/**',
      '**/CMakeFiles',
    ]
  },
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
      '@typescript-eslint/no-explicit-any': 'off',
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
      '@typescript-eslint/no-empty-interface': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
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
          markers: ['/'],
        },
        block: {
          markers: ['#__PURE__'],
        },
      }]
    }
  }
)
