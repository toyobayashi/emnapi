const fs = require('fs')
const path = require('path')

const runtimeTsconfigPath = path.join(__dirname, '../lib/runtime/tsconfig.json')
const runtimeTsconfig = JSON.parse(fs.readFileSync(runtimeTsconfigPath, 'utf8'))

const runtimeOut = path.join(path.dirname(runtimeTsconfigPath), runtimeTsconfig.compilerOptions.outFile)

const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
const libTsconfig = JSON.parse(fs.readFileSync(libTsconfigPath, 'utf8'))

const libOut = path.join(path.dirname(libTsconfigPath), libTsconfig.compilerOptions.outFile)

fs.writeFileSync(libOut,
  fs.readFileSync(libOut, 'utf8')
    .replace('__EMNAPI_RUNTIME_REPLACE__', `'${fs.readFileSync(runtimeOut, 'utf8').replace(/\\/g, "\\\\'").replace(/\r?\n/g, '\\n').replace(/'/g, "\\'")}'`)
    .replace(/(makeDynCall\(.*?\))/g, '{{{ $1 }}}'),
  'utf8'
)
