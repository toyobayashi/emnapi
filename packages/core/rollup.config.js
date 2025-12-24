import { defineConfig } from '@emnapi/shared'
import pkg from './package.json' with { type: 'json' }
import { join, dirname } from 'path'
import fs from 'fs'

const plugins = [
  ['v8', 'v8', 'emnapiCorePluginsV8'],
  ['asyncWork', 'async-work', 'emnapiCorePluginsAsyncWork'],
  ['tsfn', 'threadsafe-function', 'emnapiCorePluginsThreadSafeFunction']
]

export default [
  ...defineConfig({
    outputName: 'emnapiCore',
    outputFile: 'emnapi-core',
    defines: {
      __VERSION__: JSON.stringify(pkg.version)
    },
    plugins: [
      {
        name: 'rollup-plugin-create-plugin-entry',
        writeBundle (outputOptions) {
          const distDir = dirname(outputOptions.file)
          fs.mkdirSync(join(distDir, 'plugins'), { recursive: true })
          const entryFile = join(distDir, 'plugins', 'index.js')
          const dtsEntryFile = join(distDir, 'plugins', 'index.d.ts')
          let content = ''
          for (const [name, file] of plugins) {
            content += `export { default as ${name} } from './${file}.js'\n`
          }
          let dtsContent = "export { PluginFactory, PluginContext, EmnapiPlugin } from '../emnapi-core'\n"
          for (const [name, file] of plugins) {
            dtsContent += `export { default as ${name} } from './${file}'\n`
          }
          fs.writeFileSync(entryFile, content, 'utf8')
          fs.writeFileSync(dtsEntryFile, dtsContent, 'utf8')
        }
      }
    ]
  }),
  ...plugins.flatMap(([_, name, outputName]) => defineConfig({
    outputName,
    outputFile: `plugins/${name}`,
    dtsEntry: `dist/types/emnapi/${name}.d.ts`,
    staticDtsContent: (code) => code.replace(/\.\/index/g, '../emnapi-core'),
    input: join(import.meta.dirname, `src/emnapi/${name}.js`),
    compilerOptions: {
      declaration: false,
      declarationMap: false,
      declarationDir: undefined
    }
  }))
]
