const path = require('path')
const fs = require('fs-extra')
const rollup = require('rollup')
const ts = require('typescript')
const rollupTypescript = require('@rollup/plugin-typescript').default
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default
const rollupTerser = require('@rollup/plugin-terser').default
const dist = path.join(__dirname, '../dist')

function build () {
  /**
   * @param {ts.ScriptTarget} esversion
   * @param {boolean=} minify
   * @returns {rollup.RollupOptions}
   */
  function createInput (esversion, minify, external) {
    return {
      input: path.join(__dirname, '../src/index.js'),
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
        file: path.join(dist, 'emnapi-core.js'),
        format: 'umd',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES5, true),
      output: {
        file: path.join(dist, 'emnapi-core.min.js'),
        format: 'umd',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, false, ['tslib']),
      output: {
        file: path.join(dist, 'emnapi-core.cjs.js'),
        format: 'cjs',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, true, ['tslib']),
      output: {
        file: path.join(dist, 'emnapi-core.cjs.min.js'),
        format: 'cjs',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, false, ['tslib']),
      output: {
        file: path.join(dist, 'emnapi-core.mjs'),
        format: 'esm',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES2019, true, ['tslib']),
      output: {
        file: path.join(dist, 'emnapi-core.min.mjs'),
        format: 'esm',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput(ts.ScriptTarget.ES5, false, ['tslib']),
      output: {
        file: path.join(dist, 'emnapi-core.esm-bundler.js'),
        format: 'esm',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    }
  ]).map(conf => {
    return rollup.rollup(conf.input).then(bundle => bundle.write(conf.output))
  })).then(() => {
    const dts = path.join(__dirname, '../index.d.ts')
    const dest = path.join(__dirname, '../dist/emnapi-core.d.ts')
    const mDts = path.join(__dirname, '../dist/emnapi-core.d.mts')
    const cjsMinDts = path.join(__dirname, '../dist/emnapi-core.cjs.min.d.ts')
    const mjsMinDts = path.join(__dirname, '../dist/emnapi-core.min.d.mts')
    fs.copyFileSync(dts, dest)
    fs.copyFileSync(dts, mDts)
    fs.copyFileSync(dts, cjsMinDts)
    fs.copyFileSync(dts, mjsMinDts)
    fs.appendFileSync(dest, '\nexport as namespace emnapiCore;\n', 'utf8')
  })
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
