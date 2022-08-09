const fs = require('fs')
const path = require('path')
const { compile } = require('@tybys/tsapi')

const {
  runtimeOut
} = require('../../runtime/script/build.js')

function replaceParseTool (code) {
  return code
    .replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(endif)))/g, '$1$2')
    .replace(/\$POINTER_SIZE/g, '{{{ POINTER_SIZE }}}')
    .replace(/\$(from64\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(to64\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeGetValue\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeSetValue\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeMalloc\(.*?\))/g, '{{{ $1 }}}')
}

async function build () {
  const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
  compile(libTsconfigPath)
  const libTsconfig = JSON.parse(fs.readFileSync(libTsconfigPath, 'utf8'))

  const libOut = path.join(path.dirname(libTsconfigPath), libTsconfig.compilerOptions.outFile)

  const runtimeCode = fs.readFileSync(runtimeOut, 'utf8')
  const libCode = fs.readFileSync(libOut, 'utf8')

  fs.writeFileSync(libOut,
    replaceParseTool(
      libCode
        .replace('__EMNAPI_RUNTIME_REPLACE__', `'${runtimeCode.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}'`)
        .replace('__EMNAPI_RUNTIME_INIT__;', '')
    ),
    'utf8'
  )

  fs.writeFileSync(path.join(path.dirname(libOut), path.basename(libOut, '.js') + '_no_runtime.js'),
    replaceParseTool(
      libCode
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
    ),
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
