const fs = require('fs')
const path = require('path')
const { compile } = require('@tybys/tsapi')

const {
  runtimeOut
} = require('../../runtime/script/build.js')

async function build () {
  const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
  compile(libTsconfigPath)
  const libTsconfig = JSON.parse(fs.readFileSync(libTsconfigPath, 'utf8'))

  const libOut = path.join(path.dirname(libTsconfigPath), libTsconfig.compilerOptions.outFile)

  const runtimeCode = fs.readFileSync(runtimeOut, 'utf8')
  const libCode = fs.readFileSync(libOut, 'utf8')

  fs.writeFileSync(libOut,
    libCode
      .replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(endif)))/g, '$1$2')
      .replace('__EMNAPI_RUNTIME_REPLACE__', `'${runtimeCode.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}'`)
      .replace('__EMNAPI_RUNTIME_INIT__;', '')
      .replace(/\$POINTER_SIZE/g, '{{{ POINTER_SIZE }}}')
      .replace(/(makeGetValue\(.*?\))/g, '{{{ $1 }}}')
      .replace(/(makeSetValue\(.*?\))/g, '{{{ $1 }}}')
      .replace(/(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
      .replace(/(\$(makeMalloc\(.*?\)))/g, '{{{ $2 }}}'),
    'utf8'
  )

  fs.writeFileSync(path.join(path.dirname(libOut), path.basename(libOut, '.js') + '_no_runtime.js'),
    libCode
      .replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(endif)))/g, '$1$2')
      .replace('__EMNAPI_RUNTIME_REPLACE__', '""')
      .replace('__EMNAPI_RUNTIME_INIT__;', `
            if ('emnapiRuntime' in Module) {
              emnapi = Module.emnapiRuntime;
            }
            if (!emnapi && typeof require === 'function') {
              try {
                emnapi = require('@tybys/emnapi-runtime')
              } catch (_) {}
            }
            if (!emnapi) {
              emnapi = (function () {
                if (typeof globalThis !== 'undefined') return globalThis;
                var g = (function () { return this })();
                if (
                  !g &&
                  (function () {
                    var f;
                    try {
                      f = new Function();
                    } catch (_) {
                      return false;
                    }
                    return typeof f === 'function';
                  })()
                ) {
                  g = new Function('return this')();
                }

                if (!g) {
                  if (typeof __webpack_public_path__ === 'undefined') {
                    if (typeof global !== 'undefined') return global;
                  }
                  if (typeof window !== 'undefined') return window;
                  if (typeof self !== 'undefined') return self;
                }

                return g;
              })().__emnapi_runtime__;
            }
            if (!emnapi) {
              var err = new Error('Emnapi runtime is not detected. Check if the runtime code is imported or consider using builtin runtime js library.');
              if (typeof Module.onEmnapiInitialized === 'function') {
                Module.onEmnapiInitialized(err);
                return;
              } else {
                throw err;
              }
            }
      `)
      .replace(/\$POINTER_SIZE/g, '{{{ POINTER_SIZE }}}')
      .replace(/(makeGetValue\(.*?\))/g, '{{{ $1 }}}')
      .replace(/(makeSetValue\(.*?\))/g, '{{{ $1 }}}')
      .replace(/(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
      .replace(/(\$(makeMalloc\(.*?\)))/g, '{{{ $2 }}}'),
    'utf8'
  )
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
