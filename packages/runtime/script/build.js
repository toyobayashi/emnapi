const path = require('path')
const fs = require('fs-extra')
const rollup = require('rollup')
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupTerser = require('rollup-plugin-terser').terser
const runtimeOut = path.join(__dirname, '../dist/library_napi_runtime.js')

function build () {
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

  fs.appendFileSync(runtimeDts, '\nexport as namespace emnapi;\n', 'utf8')

  /**
   * @param {boolean=} minify
   * @returns {rollup.RollupOptions}
   */
  function createInput (minify) {
    return {
      input: path.join(__dirname, '../lib/index.js'),
      plugins: [
        rollupNodeResolve({
          mainFields: ['module', 'main']
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
      input: createInput(false),
      output: {
        file: runtimeOut,
        format: 'iife',
        name: 'emnapi',
        exports: 'named'
      }
    },
    {
      input: createInput(false),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.js'),
        format: 'umd',
        name: '__emnapi_runtime__',
        exports: 'named'
      }
    },
    {
      input: createInput(true),
      output: {
        file: path.join(path.dirname(runtimeOut), 'emnapi.min.js'),
        format: 'umd',
        name: '__emnapi_runtime__',
        exports: 'named'
      }
    }
  ]).map(conf => {
    return rollup.rollup(conf.input).then(bundle => bundle.write(conf.output))
  }))
}

exports.build = build
exports.runtimeOut = runtimeOut

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
