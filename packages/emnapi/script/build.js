const fs = require('fs')
const path = require('path')
const { createRequire } = require('module')
const { EOL } = require('os')
const ts = require('typescript')
const { compile } = require('@tybys/tsapi')
const rollupTypescript = require('@rollup/plugin-typescript').default
const rollupAlias = require('@rollup/plugin-alias').default
const { rollup } = require('rollup')

// const {
//   runtimeOut
// } = require('../../runtime/script/build.js')

function replaceParseTool (code) {
  return code
    .replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(elif)|(endif)))/g, '$1$2')
    .replace(/\$POINTER_SIZE/g, '{{{ POINTER_SIZE }}}')
    .replace(/\$(from64\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(to64\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeGetValue\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeSetValue\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
    // .replace(/\$(makeMalloc\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(getUnsharedTextDecoderView\(.*?\))/g, '{{{ $1 }}}')
}

async function build () {
  const transformerTsconfigPath = path.join(__dirname, '../transformer/tsconfig.json')
  compile(transformerTsconfigPath)

  const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
  // compile(libTsconfigPath)
  const libTsconfig = JSON.parse(fs.readFileSync(libTsconfigPath, 'utf8'))

  const libOut = path.join(path.dirname(libTsconfigPath), './dist/library_napi.js')
  const runtimeRequire = createRequire(path.join(__dirname, '../../runtime/index.js'))

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
        include: libTsconfig.include,
        transformers: {
          before: [
            {
              type: 'program',
              factory: require('../transformer/out/macro.js').default
            }
          ]
        }
      }),
      rollupAlias({
        entries: [
          { find: 'emnapi:shared', replacement: path.join(__dirname, '../src/emscripten/init.ts') }
        ]
      }),
      require('./rollup-plugin-emscripten.js').default()
    ]
  })
  await emnapiRollupBuild.write({
    file: libOut,
    format: 'esm',
    exports: 'named',
    strict: false
  })

  // const runtimeCode = fs.readFileSync(runtimeOut, 'utf8')
  const libCode = fs.readFileSync(libOut, 'utf8')

  fs.writeFileSync(libOut,
    '{{{ ((DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.indexOf("$emnapiInit") === -1 ? DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.push("$emnapiInit") : undefined), "") }}}' + EOL +
    '{{{ ((EXPORTED_RUNTIME_METHODS.indexOf("emnapiInit") === -1 ? EXPORTED_RUNTIME_METHODS.push("emnapiInit") : undefined), "") }}}' + EOL +
    replaceParseTool(
      libCode
    ),
    'utf8'
  )

  const coreTsconfigPath = path.join(__dirname, '../src/core/tsconfig.json')
  //   compile(coreTsconfigPath)
  const coreTsconfig = JSON.parse(fs.readFileSync(coreTsconfigPath, 'utf8'))
  const coreOut = path.join(path.dirname(coreTsconfigPath), '../../dist/emnapi-core.js')

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
              factory: require('../transformer/out/macro.js').default
            },
            {
              type: 'program',
              factory (program) {
                return require('../transformer/out/index.js').default(program, {
                  defines: {
                    MEMORY64: 0
                  }
                })
              }
            }
          ]
        }
      }),
      rollupAlias({
        entries: [
          { find: 'emnapi:shared', replacement: path.join(__dirname, '../src/core/init.ts') }
        ]
      })
    ]
  })
  await coreRollupBuild.write({
    file: coreOut,
    format: 'iife',
    name: 'napiModule',
    strict: false
  })

  const coreCode = fs.readFileSync(coreOut, 'utf8')
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
  const parsedCode = compiler.parseCode(coreCode)
  fs.writeFileSync(path.join(__dirname, '../../core/src/module.js'),
`import { _WebAssembly as WebAssembly } from './util.js'

export function createNapiModule (options) {
  ${parsedCode}
  return napiModule;
}
`, 'utf8')
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
