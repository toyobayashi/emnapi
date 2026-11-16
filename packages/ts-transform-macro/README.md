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
