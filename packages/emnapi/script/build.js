const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')
const { spawnSync } = require('child_process')
const ts = require('typescript')
const rollupTypescript = require('@rollup/plugin-typescript').default
const rollupAlias = require('@rollup/plugin-alias').default
const rollupReplace = require('@rollup/plugin-replace').default
const { rollup } = require('rollup')
const { rollupRegion } = require('@emnapi/shared')

const runtimeModuleSpecifier = 'emscripten:runtime'
const parseToolsModuleSpecifier = 'emscripten:parse-tools'
const sharedModuleSpecifier = 'emnapi:shared'
const runtimeRequire = createRequire(path.join(__dirname, '../../runtime/index.js'))
const ctxVarName = 'emnapiPluginCtx'

const temp = path.join(__dirname, '../../../temp')
const out = path.join(temp, 'runtime.wasm')
let __EMNAPI_RUNTIME_BINARY__ = ''

async function buildRuntimeBinary () {
  fs.mkdirSync(temp, { recursive: true })
  spawnSync(path.join(process.env.WASI_SDK_PATH, 'bin', 'clang'), [
    '--target=wasm32-unknown-unknown',
    '-matomics',
    '-mbulk-memory',
    '-nostdlib',
    '-shared',
    '-fPIC',
    '-I', path.join(__dirname, '../include/node'),
    '-O3',
    '-Wl,--no-entry,--import-undefined,--export-dynamic,--import-memory,--shared-memory,--experimental-pic',
    path.join(__dirname, '../src/js_native_api.c'),
    '-o', out
  ], { stdio: 'inherit' })
  const size = fs.statSync(out).size
  console.log(out, size)
  if (size > 4096) {
    console.log(`Built runtime binary: ${fs.statSync(out).size} bytes`)
  }
  __EMNAPI_RUNTIME_BINARY__ = `(new Uint8Array([${Array.from(fs.readFileSync(out)).join(',')}]))`
}

async function buildEmscriptenMain (tsconfigPath, libOut) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  const include = tsconfig.include.map(s => path.join(path.dirname(tsconfigPath), s))
  const input = path.join(__dirname, '../src/emscripten/index.ts')

  const emnapiRollupBuild = await rollup({
    input,
    treeshake: false,
    plugins: [
      rollupRegion(),
      rollupReplace({
        preventAssignment: true,
        __EMNAPI_RUNTIME_BINARY__
      }),
      rollupTypescript({
        tsconfig: tsconfigPath,
        tslib: path.join(
          path.dirname(runtimeRequire.resolve('tslib')),
          JSON.parse(fs.readFileSync(path.join(path.dirname(runtimeRequire.resolve('tslib')), 'package.json'))).module
        ),
        compilerOptions: {
          module: ts.ModuleKind.ESNext
        },
        include,
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
      require('@emnapi/rollup-plugin-emscripten-esm-library').plugin({
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
  console.log(`${input} -> ${libOut}`)
}

async function buildNonEmscriptenMain (tsconfigPath, outputDir) {
  const input = path.join(__dirname, '../src/core/index.ts')
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  const coreRollupBuild = await rollup({
    input,
    treeshake: false,
    plugins: [
      rollupRegion(),
      rollupReplace({
        preventAssignment: true,
        __EMNAPI_RUNTIME_BINARY__
      }),
      rollupTypescript({
        tsconfig: tsconfigPath,
        tslib: path.join(
          path.dirname(runtimeRequire.resolve('tslib')),
          JSON.parse(fs.readFileSync(path.join(path.dirname(runtimeRequire.resolve('tslib')), 'package.json'))).module
        ),
        compilerOptions: {
          module: ts.ModuleKind.ESNext
        },
        include: tsconfig.include.map(s => path.join(path.dirname(tsconfigPath), s)),
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
import { ThreadManager } from '@emnapi/wasi-threads'

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
  console.log(`${input} -> ${path.join(outputDir, 'index.js')}`)
}

async function buildEmscriptenPlugin (tsconfigPath, input, output) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  const emscriptenAsyncWorkRollupBuild = await rollup({
    input,
    treeshake: false,
    plugins: [
      rollupRegion(),
      rollupTypescript({
        tsconfig: tsconfigPath,
        tslib: path.join(
          path.dirname(runtimeRequire.resolve('tslib')),
          JSON.parse(fs.readFileSync(path.join(path.dirname(runtimeRequire.resolve('tslib')), 'package.json'))).module
        ),
        compilerOptions: {
          module: ts.ModuleKind.ESNext
        },
        include: tsconfig.include.map(s => path.join(path.dirname(tsconfigPath), s)),
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
      require('@emnapi/rollup-plugin-emscripten-esm-library').plugin({
        runtimeModuleSpecifier,
        parseToolsModuleSpecifier
      })
    ]
  })
  await emscriptenAsyncWorkRollupBuild.write({
    file: output,
    format: 'esm',
    exports: 'named',
    strict: false,
  })
  console.log(`${input} -> ${output}`)
}

async function buildNonEmscriptenPlugin (tsconfigPath, input, output, destructPluginContext, exportModules = ['env']) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'))
  const modVar = 'mod'
  const coreV8RollupBuild = await rollup({
    input,
    treeshake: false,
    external: ['emscripten:runtime', 'emnapi:shared'],
    plugins: [
      rollupRegion(),
      rollupTypescript({
        tsconfig: tsconfigPath,
        tslib: path.join(
          path.dirname(runtimeRequire.resolve('tslib')),
          JSON.parse(fs.readFileSync(path.join(path.dirname(runtimeRequire.resolve('tslib')), 'package.json'))).module
        ),
        compilerOptions: {
          module: ts.ModuleKind.ESNext
        },
        include: tsconfig.include.map(s => path.join(path.dirname(tsconfigPath), s)),
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
                  plugin: {
                    contextVar: ctxVarName
                  },
                  runtimeModuleSpecifier,
                  parseToolsModuleSpecifier
                })
              }
            }
          ]
        }
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
          return `export default function (${ctxVarName}) {
  ${destructPluginContext ? `const { ${destructPluginContext.join(', ')} } = ${ctxVarName}` : ''}
  ${parsedCode}
  return {
    importObject: (original) => {
${exportModules.map(modName => {
  return `      Object.assign(original.${modName}, ${modVar})`
})}
    }
  };
}
`
        }
      }
    ]
  })
  await coreV8RollupBuild.write({
    file: output,
    format: 'iife',
    name: modVar,
    strict: false,
    globals: {
      'emscripten:runtime': ctxVarName,
      'emnapi:shared': ctxVarName
    }
  })
  console.log(`${input} -> ${output}`)
}

async function build () {
  // await buildRuntimeBinary()
  const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
  const v8TsconfigPath = path.join(__dirname, '../src/v8/tsconfig.json')

  const emscriptenTargets = [
    buildEmscriptenMain(libTsconfigPath, path.join(__dirname, '../dist/library_napi.js')),
    buildEmscriptenPlugin(
      v8TsconfigPath,
      path.join(__dirname, '../src/v8/index.ts'),
      path.join(__dirname, '../dist/library_v8.js')
    ),
    buildEmscriptenPlugin(
      libTsconfigPath,
      path.join(__dirname, '../src/emscripten/async-work.ts'),
      path.join(__dirname, '../dist/library_async_work.js')
    ),
    buildEmscriptenPlugin(
      libTsconfigPath,
      path.join(__dirname, '../src/threadsafe-function.ts'),
      path.join(__dirname, '../dist/library_threadsafe_function.js')
    )
  ]

  const coreTsconfigPath = path.join(__dirname, '../src/core/tsconfig.json')
  const outputDir = path.join(__dirname, '../../core/src/emnapi')

  const nonEmscriptenTargets = [
    buildNonEmscriptenMain(coreTsconfigPath, outputDir),
    buildNonEmscriptenPlugin(
      v8TsconfigPath,
      path.join(__dirname, '../src/v8/index.ts'),
      path.join(outputDir, 'v8.js'),
      ['emnapiCtx', 'emnapiString']
    ),
    buildNonEmscriptenPlugin(
      coreTsconfigPath,
      path.join(__dirname, '../src/core/async-work.ts'),
      path.join(outputDir, 'async-work.js'),
      ['emnapiCtx', 'emnapiEnv', 'emnapiNodeBinding', 'emnapiAsyncWorkPoolSize'],
      ['napi']
    ),
    buildNonEmscriptenPlugin(
      coreTsconfigPath,
      path.join(__dirname, '../src/threadsafe-function.ts'),
      path.join(outputDir, 'threadsafe-function.js'),
      [
        'emnapiCtx',
        'emnapiEnv',
        'emnapiNodeBinding',
        '_emnapi_node_emit_async_destroy: __emnapi_node_emit_async_destroy',
        '_emnapi_node_emit_async_init: __emnapi_node_emit_async_init',
        '_emnapi_runtime_keepalive_pop: __emnapi_runtime_keepalive_pop',
        '_emnapi_runtime_keepalive_push: __emnapi_runtime_keepalive_push'
      ],
      ['napi']
    )
  ]

  await Promise.all([...emscriptenTargets, ...nonEmscriptenTargets])
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
