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
    staticDtsContent: (code) => code.replace(/\.\/index/g, '../emnapi-core'),
    input: join(import.meta.dirname, 'src/emnapi/v8.js'),
    compilerOptions: {
      declaration: false,
      declarationMap: false,
      declarationDir: undefined
    }
  }),
  ...defineConfig({
    outputName: 'emnapiCorePluginsAsyncWork',
    outputFile: 'plugins/async-work',
    dtsEntry: 'dist/types/emnapi/async-work.d.ts',
    staticDtsContent: (code) => code.replace(/\.\/index/g, '../emnapi-core'),
    input: join(import.meta.dirname, 'src/emnapi/async-work.js'),
    compilerOptions: {
      declaration: false,
      declarationMap: false,
      declarationDir: undefined
    }
  })
]
