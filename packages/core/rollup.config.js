import { defineConfig } from '@emnapi/shared'
import pkg from './package.json' with { type: 'json' }
import { join } from 'path'

export default [
  ...defineConfig({
    outputName: 'emnapiCore',
    outputFile: 'emnapi-core',
    defines: {
      __VERSION__: JSON.stringify(pkg.version)
    }
  }),
  ...defineConfig({
    outputName: 'emnapiCorePluginsV8',
    outputFile: 'plugins/v8',
    dtsEntry: 'dist/types/emnapi/v8.d.ts',
    input: join(import.meta.dirname, 'src/emnapi/v8.js'),
    cjs: false,
    browser: false,
    umd: true,
    compilerOptions: {
      declaration: false,
      declarationMap: false,
      declarationDir: undefined
    }
  })
]
