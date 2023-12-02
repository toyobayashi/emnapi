import { join, dirname } from 'path'
import { defineConfig } from 'rollup'
import rollupTs from '@rollup/plugin-typescript'
import { fileURLToPath } from 'url'
import rollupEmscripten from '@emnapi/rollup-plugin-emscripten-esm-library'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  input: join(__dirname, './src/index.ts'),
  output: {
    file: join(__dirname, '../actual/bundle.js'),
    format: 'esm'
  },
  plugins: [
    rollupTs({ tsconfig: join(__dirname, 'tsconfig.json') }),
    rollupEmscripten.default()
  ]
})
