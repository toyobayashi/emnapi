import { defineConfig } from '@emnapi/shared'

export default defineConfig({
  outputFile: 'index',
  browser: false,
  sourcemap: true,
  external: ['@emnapi/ts-transform-emscripten-esm-library']
})
