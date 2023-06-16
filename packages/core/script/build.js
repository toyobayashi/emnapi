const path = require('path')
const fs = require('fs-extra')
const rollup = require('rollup')
const rollupNodeResolve = require('@rollup/plugin-node-resolve').default
const rollupReplace = require('@rollup/plugin-replace').default
const rollupTerser = require('@rollup/plugin-terser').default
const dist = path.join(__dirname, '../dist')
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
      downlevelIteration: false
    }
  })

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
    },
    {
      input: createInput('es5', false, { resolveOnly: [/^(?!(tslib)).*?$/] }),
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
    fs.copyFileSync(dts, dest)
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
