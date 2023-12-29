# @emnapi/rollup-plugin-emscripten-esm-library

See https://github.com/toyobayashi/emnapi/blob/main/packages/ts-transform-emscripten-esm-library#readme

```js
// rollup.config.mjs
import { defineConfig } from 'rollup'
import rollupEmscriptenEsmLibrary from '@emnapi/rollup-plugin-emscripten-esm-library'

export default defineConfig({
  /* ... */
  output: {
    /* ... */

    /**
     * required,
     * ensure no import declaration left in the final output
     */
    format: 'esm'
  },
  plugins: [
    rollupEmscriptenEsmLibrary({
      /** @type {string[]} */
      defaultLibraryFuncsToInclude: [ /* ... */],

      /** @type {string[]} */
      exportedRuntimeMethods: [ /* ... */ ],

      /** @type {boolean} */
      processDirective: true,

      /** @type {boolean} */
      processParseTools: true

      /** @type {string} */
      runtimeModuleSpecifier: 'emscripten:runtime',

      /** @type {string} */
      parseToolsModuleSpecifier: 'emscripten:parse-tools'
    })
  ]
})
```
