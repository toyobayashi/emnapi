import { join } from 'path'
import { defineConfig } from 'rollup'
import rollupTs from '@rollup/plugin-typescript'
import { plugin as rollupEmscripten } from '@emnapi/rollup-plugin-emscripten-esm-library'

export default defineConfig({
  input: join(import.meta.dirname, './src/index.ts'),
  output: {
    file: join(import.meta.dirname, '../actual/bundle.js'),
    format: 'esm'
  },
  plugins: [
    rollupTs({ tsconfig: join(import.meta.dirname, 'tsconfig.json') }),
    rollupEmscripten()
  ]
})
