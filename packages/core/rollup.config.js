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
    outputName: 'emnapiCorePlugins',
    outputFile: 'emnapi-core-plugins',
    dtsEntry: 'dist/types/plugins.d.ts',
    input: join(import.meta.dirname, 'src/plugins.ts'),
  })
]
