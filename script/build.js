const fs = require('fs')
const path = require('path')
const { minify } = require('terser')

const runtimeTsconfigPath = path.join(__dirname, '../lib/runtime/tsconfig.json')
const runtimeTsconfig = JSON.parse(fs.readFileSync(runtimeTsconfigPath, 'utf8'))

const runtimeOut = path.join(path.dirname(runtimeTsconfigPath), runtimeTsconfig.compilerOptions.outFile)

const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
const libTsconfig = JSON.parse(fs.readFileSync(libTsconfigPath, 'utf8'))

const libOut = path.join(path.dirname(libTsconfigPath), libTsconfig.compilerOptions.outFile)

const runtimeCode = fs.readFileSync(runtimeOut, 'utf8')
const libCode = fs.readFileSync(libOut, 'utf8')

fs.writeFileSync(libOut,
  libCode
    .replace('__EMNAPI_RUNTIME_REPLACE__', `'${runtimeCode.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}'`)
    .replace('__EMNAPI_RUNTIME_INIT__;', '')
    .replace(/(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
    /* .replace(/(makeMalloc\(.*?\))/g, '{{{ $1 }}}') */,
  'utf8'
)

const emnapijs = path.join(path.dirname(runtimeOut), 'emnapi.js')
const emnapijsCode = `(function (root, factory) {
    if(typeof exports === 'object' && typeof module === 'object') {
        module.exports = factory();
    } else if(typeof define === 'function' && define.amd) {
        define([], function () {
            return factory();
        });
    } else if(typeof exports === 'object') {
        exports['emnapi'] = factory();
    } else {
        root['emnapi'] = factory();
    }
})((function (defaultValue) {
    var g;
    g = (function () { return this; })();

    try {
        g = g || new Function('return this')();
    } catch (_) {
        if (typeof globalThis !== 'undefined') return globalThis;
        if (typeof __webpack_public_path__ === 'undefined') {
            if (typeof global !== 'undefined') return global;
        }
        if (typeof window !== 'undefined') return window;
        if (typeof self !== 'undefined') return self;
    }

    return g || defaultValue;
})(this), function () {
    ${runtimeCode}
    return emnapi;
});`

fs.writeFileSync(emnapijs, emnapijsCode, 'utf8')

minify(emnapijsCode, { compress: true, mangle: true, ecma: 5 }).then(res => {
  fs.writeFileSync(path.join(path.dirname(runtimeOut), 'emnapi.min.js'), res.code, 'utf8')
}).catch(err => {
  console.log(JSON.stringify(err))
})

/* fs.writeFileSync(path.join(path.dirname(runtimeOut), 'emnapi.d.ts'),
  `${fs.readFileSync(path.join(path.dirname(runtimeOut), path.basename(runtimeOut, '.js') + '.d.ts'))}\nexport = emnapi;\n`,
  'utf8'
) */

fs.writeFileSync(path.join(path.dirname(libOut), path.basename(libOut, '.js') + '_no_runtime.js'),
  libCode
    .replace('__EMNAPI_RUNTIME_REPLACE__', '""')
    .replace('__EMNAPI_RUNTIME_INIT__;', `
      (function () {
        if ('emnapi' in Module) {
          emnapi = Module.emnapi
        }
        if (!emnapi && typeof require === 'function') {
          try {
            emnapi = require('@tybys/emnapi/dist/emnapi.js')
          } catch (_) {}
        }
        if (!emnapi) {
          emnapi = (function () {
            let g
            g = (function () { return this })()
    
            try {
              g = g || new Function('return this')()
            } catch (_) {
              if (typeof globalThis !== 'undefined') return globalThis
              if (typeof __webpack_public_path__ === 'undefined') {
                if (typeof global !== 'undefined') return global
              }
              if (typeof window !== 'undefined') return window
              if (typeof self !== 'undefined') return self
            }
    
            return g
          })().emnapi
        }
      })();`)
    .replace(/(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
    /* .replace(/(makeMalloc\(.*?\))/g, '{{{ $1 }}}') */,
  'utf8'
)
