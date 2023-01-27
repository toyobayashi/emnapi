const path = require('path')
const rollup = require('rollup')
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default
const rollupTerser = require('rollup-plugin-terser').terser
const dist = path.join(__dirname, '../dist')

function build () {
  /**
   * @param {'es5' | 'es2019'} esversion
   * @param {boolean=} minify
   * @returns {rollup.RollupOptions}
   */
  function createInput (esversion, minify, options) {
    return {
      input: path.join(__dirname, '../src/index.js'),
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
        file: path.join(dist, 'emnapi-core.js'),
        format: 'umd',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es5', true),
      output: {
        file: path.join(dist, 'emnapi-core.min.js'),
        format: 'umd',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', false, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(dist, 'emnapi-core.cjs.js'),
        format: 'cjs',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', true, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(dist, 'emnapi-core.cjs.min.js'),
        format: 'cjs',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', false, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(dist, 'emnapi-core.mjs'),
        format: 'esm',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    },
    {
      input: createInput('es2019', true, { resolveOnly: [/^(?!(tslib)).*?$/] }),
      output: {
        file: path.join(dist, 'emnapi-core.min.mjs'),
        format: 'esm',
        name: 'emnapiCore',
        exports: 'named',
        strict: false
      }
    }
  ]).map(conf => {
    return rollup.rollup(conf.input).then(bundle => bundle.write(conf.output))
  }))
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
