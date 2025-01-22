const path = require('path')
const fs = require('fs-extra')
const rollup = require('rollup')
const ts = require('typescript')
const rollupTypescript = require('@rollup/plugin-typescript').default
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default
const rollupTerser = require('@rollup/plugin-terser').default
const rollupAlias = require('@rollup/plugin-alias').default
const { compile } = require('@tybys/tsapi')
const dist = path.join(__dirname, '../dist')

function build () {
  compile(path.join(__dirname, '../tsconfig.json'), {
    optionsToExtend: {
      target: require('typescript').ScriptTarget.ES2021,
      outDir: path.join(__dirname, '../lib'),
      emitDeclarationOnly: true,
      declaration: true,
      declarationMap: true,
      declarationDir: path.join(__dirname, '../lib/typings')
    }
  })

  /**
   * @param {ts.ScriptTarget} esversion
   * @param {boolean=} minify
   * @returns {rollup.RollupOptions}
   */
  function createInput (esversion, minify, external) {
    return {
      input: path.join(__dirname, '../src/index.ts'),
      external,
      plugins: [
        rollupTypescript({
          tsconfig: path.join(__dirname, '../tsconfig.json'),
          tslib: path.join(
            path.dirname(require.resolve('tslib')),
            JSON.parse(fs.readFileSync(path.join(path.dirname(require.resolve('tslib')), 'package.json'))).module
          ),
          compilerOptions: {
            target: esversion,
            ...(esversion !== ts.ScriptTarget.ES5 ? { removeComments: true, downlevelIteration: false } : {})
          },
          include: [
            './src/**/*'
          ],
          transformers: {
            after: [
              require('@tybys/ts-transform-pure-class').default
            ]
          }
        }),
        rollupAlias({
          entries: [
            { find: '@', replacement: path.join(__dirname, '../src') }
          ]
        }),
        rollupNodeResolve({
          mainFields: ['module', 'main']
        }),
        rollupReplace({
          preventAssignment: true,
          values: {
            __VERSION__: JSON.stringify(require('../package.json').version)
          }
        }),
        ...(minify
          ? [
              rollupTerser({
                compress: true,
                mangle: true,
                format: {
                  comments: false
                }
              })
            ]
          : [])
      ]
    }
  }

  const globalName = 'wasiThreads'

  return Promise.all(([
    {
      input: createInput(ts.ScriptTarget.ES2021, false),
      output: {
        file: path.join(dist, 'wasi-threads.js'),
        format: 'umd',
        name: globalName,
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2021, true),
      output: {
        file: path.join(dist, 'wasi-threads.min.js'),
        format: 'umd',
        name: globalName,
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2021, false, ['tslib']),
      output: {
        file: path.join(dist, 'wasi-threads.cjs.js'),
        format: 'cjs',
        name: globalName,
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2021, true, ['tslib']),
      output: {
        file: path.join(dist, 'wasi-threads.cjs.min.js'),
        format: 'cjs',
        name: globalName,
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2021, false, ['tslib']),
      output: {
        file: path.join(dist, 'wasi-threads.mjs'),
        format: 'esm',
        name: globalName,
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2021, true, ['tslib']),
      output: {
        file: path.join(dist, 'wasi-threads.min.mjs'),
        format: 'esm',
        name: globalName,
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2021, false, ['tslib']),
      output: {
        file: path.join(dist, 'wasi-threads.esm-bundler.js'),
        format: 'esm',
        name: globalName,
        exports: 'named',
        strict: false
      }
    }
  ]).map(conf => {
    return rollup.rollup(conf.input).then(bundle => bundle.write(conf.output))
  })).then(() => {
    const {
      Extractor,
      ExtractorConfig
    } = require('@microsoft/api-extractor')
    const apiExtractorJsonPath = path.join(__dirname, '../api-extractor.json')
    const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)
    const extractorResult = Extractor.invoke(extractorConfig, {
      localBuild: true,
      showVerboseMessages: true
    })
    if (extractorResult.succeeded) {
      console.log('API Extractor completed successfully')
    } else {
      const errmsg = `API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`
      return Promise.reject(new Error(errmsg))
    }

    const dts = extractorConfig.publicTrimmedFilePath

    const mDts = path.join(__dirname, '../dist/wasi-threads.d.mts')
    const cjsMinDts = path.join(__dirname, '../dist/wasi-threads.cjs.min.d.ts')
    const mjsMinDts = path.join(__dirname, '../dist/wasi-threads.min.d.mts')
    fs.copyFileSync(dts, mDts)
    fs.copyFileSync(dts, cjsMinDts)
    fs.copyFileSync(dts, mjsMinDts)
    fs.appendFileSync(dts, `\nexport as namespace ${globalName};\n`, 'utf8')
  })
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
