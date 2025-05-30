import { defineConfig } from '@emnapi/shared'
import fs from 'fs'
import path from 'path'
import { EOL } from 'os'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  outputName: 'emnapi',
  outputFile: 'emnapi',
  sourcemap: true,
  defines: {
    __VERSION__: JSON.stringify(pkg.version)
  },
  apiExtractorCallback: (result) => {
    if (result.succeeded) {
      let dts = ''
      dts += '/// <reference lib="esnext.disposable" />' + EOL + EOL
      dts += fs.readFileSync(path.join(import.meta.dirname, 'src/typings/common.d.ts'), 'utf8').replace(/declare/g, 'export declare')
      dts += fs.readFileSync(path.join(import.meta.dirname, 'src/typings/ctype.d.ts'), 'utf8').replace(/declare/g, 'export declare')
      dts += fs.readFileSync(path.join(import.meta.dirname, 'src/typings/napi.d.ts'), 'utf8').replace(/declare/g, 'export declare')
      dts += fs.readFileSync(result.extractorConfig.publicTrimmedFilePath, 'utf8')
      fs.writeFileSync(result.extractorConfig.publicTrimmedFilePath, dts, 'utf8')
    }
  }
})
