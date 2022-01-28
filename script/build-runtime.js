const path = require('path')
const fs = require('fs-extra')
const rollup = require('rollup')
const rollupTypescript = require('@rollup/plugin-typescript')
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupTerser = require('rollup-plugin-terser').terser
const { runtimeOut } = require('./common.js')

const {
  Extractor,
  ExtractorConfig
} = require('@microsoft/api-extractor')
const apiExtractorJsonPath = path.join(__dirname, '../lib/runtime/api-extractor.json')
const extractorConfig = ExtractorConfig.loadFileAndPrepare(apiExtractorJsonPath)
const extractorResult = Extractor.invoke(extractorConfig, {
  localBuild: true,
  showVerboseMessages: true
})
if (extractorResult.succeeded) {
  console.log('API Extractor completed successfully')
} else {
  console.error(`API Extractor completed with ${extractorResult.errorCount} errors and ${extractorResult.warningCount} warnings`)
  process.exit(1)
}

const runtimeDts = extractorConfig.publicTrimmedFilePath

fs.removeSync(path.join(__dirname, '../dist/runtime'))
fs.appendFileSync(runtimeDts, '\nexport as namespace emnapi;\n', 'utf8')

const runtimeTsconfigPath = path.join(__dirname, '../tsconfig.prod.json')

/**
 * @param {boolean=} minify
 * @returns {rollup.RollupOptions}
 */
function createInput (minify) {
  return {
    input: path.join(__dirname, '../lib/runtime/index.ts'),
    plugins: [
      rollupNodeResolve({
        mainFields: ['module', 'main']
      }),
      rollupTypescript({
        tsconfig: runtimeTsconfigPath
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

Promise.all(([
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
      name: 'emnapi',
      exports: 'named'
    }
  },
  {
    input: createInput(true),
    output: {
      file: path.join(path.dirname(runtimeOut), 'emnapi.min.js'),
      format: 'umd',
      name: 'emnapi',
      exports: 'named'
    }
  }
]).map(conf => {
  return rollup.rollup(conf.input).then(bundle => bundle.write(conf.output))
}))
