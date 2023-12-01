const path = require('path')
const fs = require('fs-extra')
const rollup = require('rollup')
const ts = require('typescript')
const rollupTypescript = require('@rollup/plugin-typescript').default
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default
const rollupTerser = require('@rollup/plugin-terser').default
const runtimeOut = path.join(__dirname, '../dist/emnapi.iife.js')
const { compile } = require('@tybys/tsapi')

function build () {
  compile(path.join(__dirname, '../tsconfig.json'), {
    optionsToExtend: {
      target: require('typescript').ScriptTarget.ES2019,
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
            ...(esversion !== ts.ScriptTarget.ES5
              ? {
                  removeComments: true,
                  downlevelIteration: false
                }
              : {})
          },
          include: [
            './src/**/*.ts'
          ],
          transformers: {
            after: [
              require('@tybys/ts-transform-pure-class').default
            ]
          }
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

  return Promise.all(([
    {
      input: createInput(ts.ScriptTarget.ES5, false),
      output: {
        file: runtimeOut,
        format: 'iife',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES5, false),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.js'),
        format: 'umd',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES5, true),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.min.js'),
        format: 'umd',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, false, ['tslib']),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.cjs.js'),
        format: 'cjs',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, true, ['tslib']),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.cjs.min.js'),
        format: 'cjs',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, false, ['tslib']),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.mjs'),
        format: 'esm',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, true, ['tslib']),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.min.mjs'),
        format: 'esm',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES5, false, ['tslib']),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.esm-bundler.js'),
        format: 'esm',
        name: 'emnapi',
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

    const runtimeDts = extractorConfig.publicTrimmedFilePath

    const iifeDtsPath = path.join(__dirname, '../dist/emnapi.iife.d.ts')
    const mDtsPath = path.join(__dirname, '../dist/emnapi.d.mts')
    const cjsMinDtsPath = path.join(__dirname, '../dist/emnapi.cjs.min.d.ts')
    const mjsMinDtsPath = path.join(__dirname, '../dist/emnapi.min.d.mts')
    fs.copyFileSync(runtimeDts, iifeDtsPath)

    let iifeDts = fs.readFileSync(iifeDtsPath, 'utf8')
    iifeDts = iifeDts.replace(/export { }/g, '')
    iifeDts = iifeDts.replace(/export declare/g, 'export')
    iifeDts = iifeDts.replace(/declare /g, '')
    iifeDts = 'declare namespace emnapi {\n\n' + iifeDts
    iifeDts += '\n\n}'
    fs.writeFileSync(iifeDtsPath, iifeDts, 'utf8')

    let dts = ''
    dts += fs.readFileSync(path.join(__dirname, '../src/typings/common.d.ts'), 'utf8').replace(/declare/g, 'export declare')
    dts += fs.readFileSync(path.join(__dirname, '../src/typings/ctype.d.ts'), 'utf8').replace(/declare/g, 'export declare')
    dts += fs.readFileSync(path.join(__dirname, '../src/typings/napi.d.ts'), 'utf8').replace(/declare/g, 'export declare')
    dts += fs.readFileSync(runtimeDts, 'utf8')
    fs.writeFileSync(mDtsPath, dts, 'utf8')
    fs.writeFileSync(cjsMinDtsPath, dts, 'utf8')
    dts += '\nexport as namespace emnapi;\n'
    fs.writeFileSync(runtimeDts, dts, 'utf8')

    fs.copyFileSync(mDtsPath, mjsMinDtsPath)
  })
}

exports.build = build
exports.runtimeOut = runtimeOut

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
