# @emnapi/ts-transform-macro

Example: see https://github.com/toyobayashi/emnapi/blob/main/packages/emnapi/src/macro.ts

```js
// webpack.config.js
const { createTransformerFactory } = require('@emnapi/ts-transform-macro')

module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              getCustomTransformers (program) {
                return {
                  before: [
                    createTransformerFactory(program)
                  ]
                }
              }
            }
          }
        ]
      }
    ]
  }
}
```

```js
// rollup.config.mjs
import { defineConfig } from 'rollup'
import rollupTypescript from '@rollup/plugin-typescript'
import { createTransformerFactory } from '@emnapi/ts-transform-macro'

export default defineConfig({
  plugins: [
    rollupTypescript({
      transformers: {
        before: [
          {
            type: 'program',
            factory: (program) => {
              return createTransformerFactory(program)
            }
          }
        ]
      }
    })
  ]
})
```
