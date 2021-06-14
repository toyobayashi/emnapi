module.exports = function (_options, { isDebug, isEmscripten }) {
  const debugFlags = isEmscripten
    ? [
        '-sDISABLE_EXCEPTION_CATCHING=0',
        '-sSAFE_HEAP=1'
      ]
    : []

  const commonFlags = isEmscripten
    ? [
        // '--bind',
        // '-sDYNCALLS=1',
        // '-sERROR_ON_UNDEFINED_SYMBOLS=0', if add js function to imports.env
        "-sEXPORTED_FUNCTIONS=['_malloc','_free']",
        '-sALLOW_MEMORY_GROWTH=1',
        '-sNODEJS_CATCH_EXIT=0',
        ...(isDebug ? debugFlags : [])
      ]
    : []

  const createTarget = (name, sources, needEntry) => ({
    name: name,
    type: isEmscripten ? 'exe' : 'node',
    sources: needEntry ? (sources.push('./test/entry_point.c'), sources) : sources,
    emwrap: {
      exportsOnInit: ['emnapi']
    },
    libs: ['testcommon'],
    includePaths: isEmscripten ? ['./include'] : [],
    compileOptions: [...commonFlags],
    // eslint-disable-next-line no-template-curly-in-string
    linkOptions: [...commonFlags, ...(isEmscripten ? ['--js-library=${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js'] : [])]
  })

  return {
    project: 'emnapitest',
    targets: [
      {
        type: 'lib',
        name: 'testcommon',
        sources: ['./test/common.c'],
        includePaths: isEmscripten
          ? ['./include']
          : [`${require('path').join(require('os').homedir(), 'AppData/Local/node-gyp/Cache', process.versions.node, 'include/node')}`],
        compileOptions: [...commonFlags],
        linkOptions: [...commonFlags]
      },
      createTarget('env', ['./test/env/binding.c']),
      createTarget('value', ['./test/value/binding.c']),
      createTarget('hello', ['./test/hello/binding.c']),
      createTarget('arg', ['./test/arg/binding.c'], true),
      createTarget('callback', ['./test/callback/binding.c'], true),
      createTarget('objfac', ['./test/objfac/binding.c'], true),
      createTarget('fnfac', ['./test/fnfac/binding.c'], true),
      createTarget('general', ['./test/general/binding.c'], true),
      createTarget('string', ['./test/string/binding.c'], true),
      createTarget('property', ['./test/property/binding.c'], true),
      createTarget('promise', ['./test/promise/binding.c'], true),
      createTarget('object', ['./test/object/test_null.c', './test/object/test_object.c'], true),
      createTarget('objwrap', ['./test/objwrap/myobject.cc'], true),
      createTarget('bigint', ['./test/bigint/binding.c'], true),
      createTarget('fnwrap', ['./test/fnwrap/myobject.cc', './test/fnwrap/binding.cc'], true),
      createTarget('passwrap', ['./test/passwrap/myobject.cc', './test/passwrap/binding.cc'], true),
      createTarget('array', ['./test/array/binding.c'], true),
      createTarget('constructor', ['./test/constructor/binding.c'], true),
      createTarget('conversion', ['./test/conversion/test_conversions.c', './test/conversion/test_null.c'], true),
      createTarget('dataview', ['./test/dataview/binding.c'], true),
      createTarget('date', ['./test/date/binding.c'], true),
      createTarget('error', ['./test/error/binding.c'], true),
      createTarget('exception', ['./test/exception/binding.c'], true),
      createTarget('ref', ['./test/ref/binding.c'], true),
      createTarget('function', ['./test/function/binding.c'], true),
      createTarget('scope', ['./test/scope/binding.c'], true),
      createTarget('newtarget', ['./test/newtarget/binding.c'], true),
      createTarget('number', ['./test/number/binding.c'], true)
    ]
  }
}
