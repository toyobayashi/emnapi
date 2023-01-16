const path = require('path')
const fs = require('fs-extra')
const rollup = require('rollup')
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default
const rollupTerser = require('rollup-plugin-terser').terser
const runtimeOut = path.join(__dirname, '../dist/emnapi.iife.js')
const { compile } = require('@tybys/tsapi')

function build () {
  compile(path.join(__dirname, '../tsconfig.json'), {
    optionsToExtend: {
      target: require('typescript').ScriptTarget.ES5,
      outDir: path.join(__dirname, '../lib/es5')
    }
  })
  compile(path.join(__dirname, '../tsconfig.json'), {
    optionsToExtend: {
      target: require('typescript').ScriptTarget.ES2019,
      outDir: path.join(__dirname, '../lib/es2019'),
      removeComments: true,
      declaration: true,
      declarationMap: true,
      declarationDir: path.join(__dirname, '../lib/typings'),
      downlevelIteration: false
    }
  })
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

  /**
   * @param {'es5' | 'es2019'} esversion
   * @param {boolean=} minify
   * @returns {rollup.RollupOptions}
   */
  function createInput (esversion, minify, options) {
    return {
      input: path.join(__dirname, '../lib', esversion, 'index.js'),
      plugins: [
        rollupNodeResolve({
          mainFields: ['module', 'main'],
          ...((options && options.resolveOnly) ? { resolveOnly: options.resolveOnly } : {})
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
      input: createInput('es5', false),
      output: {
        file: runtimeOut,
        format: 'iife',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es5', false),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.js'),
        format: 'umd',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es5', true),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.min.js'),
        format: 'umd',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', false, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.cjs.js'),
        format: 'cjs',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', true, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.cjs.min.js'),
        format: 'cjs',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', false, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.mjs'),
        format: 'esm',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', true, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.min.mjs'),
        format: 'esm',
        name: 'emnapi',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es5', false, { resolveOnly: [/^(?!(tslib)).*?$/] }),
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
    const iifeDtsPath = path.join(__dirname, '../dist/emnapi.iife.d.ts')
    fs.copyFileSync(runtimeDts, iifeDtsPath)
    fs.appendFileSync(runtimeDts, '\nexport as namespace emnapi;\n', 'utf8')

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
    fs.writeFileSync(runtimeDts, dts, 'utf8')
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
