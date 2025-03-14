import { defineConfig } from '@emnapi/shared'
import pkg from './package.json' with { type: "json" }

export default defineConfig({
  outputName: 'emnapiCore',
  outputFile: 'emnapi-core',
  defines: {
    __VERSION__: JSON.stringify(pkg.version)
  }
})
