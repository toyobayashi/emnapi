const fs = require('fs')
const path = require('path')

const {
  runtimeOut
} = require('../../runtime/script/build.js')

async function build () {
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

  fs.writeFileSync(path.join(path.dirname(libOut), path.basename(libOut, '.js') + '_no_runtime.js'),
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
            let g;
            g = (function () { return this })();
    
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
      .replace(/(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
      /* .replace(/(makeMalloc\(.*?\))/g, '{{{ $1 }}}') */,
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
