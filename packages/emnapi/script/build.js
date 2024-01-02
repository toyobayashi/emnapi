const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')
const ts = require('typescript')
const rollupTypescript = require('@rollup/plugin-typescript').default
const rollupAlias = require('@rollup/plugin-alias').default
const { rollup } = require('rollup')

// const {
//   runtimeOut
// } = require('../../runtime/script/build.js')

async function build () {
  const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
  // compile(libTsconfigPath)
  const libTsconfig = JSON.parse(fs.readFileSync(libTsconfigPath, 'utf8'))

  const libOut = path.join(path.dirname(libTsconfigPath), './dist/library_napi.js')
  const runtimeRequire = createRequire(path.join(__dirname, '../../runtime/index.js'))

  const runtimeModuleSpecifier = 'emscripten:runtime'
  const parseToolsModuleSpecifier = 'emscripten:parse-tools'
  const sharedModuleSpecifier = 'emnapi:shared'

  const emnapiRollupBuild = await rollup({
    input: path.join(__dirname, '../src/emscripten/index.ts'),
    treeshake: false,
    plugins: [
      rollupTypescript({
        tsconfig: libTsconfigPath,
        tslib: path.join(
          path.dirname(runtimeRequire.resolve('tslib')),
          JSON.parse(fs.readFileSync(path.join(path.dirname(runtimeRequire.resolve('tslib')), 'package.json'))).module
        ),
        compilerOptions: {
          module: ts.ModuleKind.ESNext
        },
        include: libTsconfig.include.map(s => path.join(__dirname, '..', s)),
        transformers: {
          before: [
            {
              type: 'program',
              factory: require('@emnapi/ts-transform-macro').createTransformerFactory
            }
          ]
        }
      }),
      rollupAlias({
        entries: [
          { find: sharedModuleSpecifier, replacement: path.join(__dirname, '../src/emscripten/init.ts') }
        ]
      }),
      require('@emnapi/rollup-plugin-emscripten-esm-library').default({
        defaultLibraryFuncsToInclude: ['$emnapiInit'],
        exportedRuntimeMethods: ['emnapiInit'],
        runtimeModuleSpecifier,
        parseToolsModuleSpecifier
      })
    ]
  })
  await emnapiRollupBuild.write({
    file: libOut,
    format: 'esm',
    exports: 'named',
    strict: false
  })

  // const runtimeCode = fs.readFileSync(runtimeOut, 'utf8')

  const coreTsconfigPath = path.join(__dirname, '../src/core/tsconfig.json')
  //   compile(coreTsconfigPath)
  const coreTsconfig = JSON.parse(fs.readFileSync(coreTsconfigPath, 'utf8'))
  // const coreOut = path.join(path.dirname(coreTsconfigPath), '../../dist/emnapi-core.js')
  const outputDir = path.join(path.dirname(coreTsconfigPath), '../../../core/src/emnapi')

  const coreRollupBuild = await rollup({
    input: path.join(__dirname, '../src/core/index.ts'),
    treeshake: false,
    plugins: [
      rollupTypescript({
        tsconfig: coreTsconfigPath,
        tslib: path.join(
          path.dirname(runtimeRequire.resolve('tslib')),
          JSON.parse(fs.readFileSync(path.join(path.dirname(runtimeRequire.resolve('tslib')), 'package.json'))).module
        ),
        compilerOptions: {
          module: ts.ModuleKind.ESNext
        },
        include: coreTsconfig.include.map(s => path.join(__dirname, '../src/core', s)),
        transformers: {
          before: [
            {
              type: 'program',
              factory: require('@emnapi/ts-transform-macro').createTransformerFactory
            },
            {
              type: 'program',
              factory (program) {
                return require('@emnapi/ts-transform-emscripten-parse-tools').createTransformerFactory(program, {
                  defines: {
                    MEMORY64: 0
                  },
                  runtimeModuleSpecifier,
                  parseToolsModuleSpecifier
                })
              }
            }
          ]
        }
      }),
      rollupAlias({
        entries: [
          { find: sharedModuleSpecifier, replacement: path.join(__dirname, '../src/core/init.ts') },
          { find: runtimeModuleSpecifier, replacement: path.join(__dirname, '../src/core/init.ts') }
        ]
      }),
      {
        name: 'preprocess',
        renderChunk (code) {
          const { Compiler } = require('./preprocess.js')
          const compiler = new Compiler({
            defines: {
              DYNAMIC_EXECUTION: 1,
              TEXTDECODER: 1,
              LEGACY_RUNTIME: 1,
              WASM_BIGINT: 1,
              MEMORY64: 0
            }
          })
          const parsedCode = compiler.parseCode(code)
          return `import { _WebAssembly as WebAssembly } from '@/util'

export function createNapiModule (options) {
  ${parsedCode}
  return napiModule;
}
`
        }
      }
    ]
  })
  await coreRollupBuild.write({
    // file: coreOut,
    dir: outputDir,
    format: 'iife',
    name: 'napiModule',
    strict: false
  })
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
