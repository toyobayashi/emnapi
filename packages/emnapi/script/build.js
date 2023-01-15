const fs = require('fs')
const path = require('path')
const { EOL } = require('os')
const { compile } = require('@tybys/tsapi')

// const {
//   runtimeOut
// } = require('../../runtime/script/build.js')

function replaceParseTool (code) {
  return code
    .replace(/(\r?\n)\s*\/\/\s+(#((if)|(else)|(elif)|(endif)))/g, '$1$2')
    .replace(/\$POINTER_SIZE/g, '{{{ POINTER_SIZE }}}')
    .replace(/\$(from64\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(to64\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeGetValue\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeSetValue\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeDynCall\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(makeMalloc\(.*?\))/g, '{{{ $1 }}}')
    .replace(/\$(getUnsharedTextDecoderView\(.*?\))/g, '{{{ $1 }}}')
}

async function build () {
  const libTsconfigPath = path.join(__dirname, '../tsconfig.json')
  compile(libTsconfigPath)
  const libTsconfig = JSON.parse(fs.readFileSync(libTsconfigPath, 'utf8'))

  const libOut = path.join(path.dirname(libTsconfigPath), libTsconfig.compilerOptions.outFile)

  // const runtimeCode = fs.readFileSync(runtimeOut, 'utf8')
  const libCode = fs.readFileSync(libOut, 'utf8')

  fs.writeFileSync(libOut,
    '{{{ ((DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.indexOf("$emnapiInit") === -1 ? DEFAULT_LIBRARY_FUNCS_TO_INCLUDE.push("$emnapiInit") : undefined), "") }}}' + EOL +
    '{{{ ((EXPORTED_RUNTIME_METHODS.indexOf("emnapiInit") === -1 ? EXPORTED_RUNTIME_METHODS.push("emnapiInit") : undefined), "") }}}' + EOL +
    replaceParseTool(
      libCode
    ),
    'utf8'
  )

  // fs.writeFileSync(path.join(path.dirname(libOut), path.basename(libOut, '.js') + '_no_runtime.js'),
  //   replaceParseTool(
  //     libCode
  //       .replace('__EMNAPI_RUNTIME_REPLACE__', '""')
  //   ),
  //   'utf8'
  // )
}

exports.build = build

if (module === require.main) {
  build().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
