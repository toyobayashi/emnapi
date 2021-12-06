module.exports = function (_options, { isDebug, isEmscripten }) {
  const compilerFlags = isEmscripten
    ? [
        // ...(isDebug ? ['-sDISABLE_EXCEPTION_CATCHING=0'] : [])
      ]
    : []

  const linkerFlags = isEmscripten
    ? [
        // "-sEXPORTED_FUNCTIONS=['_malloc','_free']",
        '-sALLOW_MEMORY_GROWTH=1',
        ...(isDebug ? ['-sSAFE_HEAP=1'/* , '-sDISABLE_EXCEPTION_CATCHING=0' */] : [])
      ]
    : []

  const createTarget = (name, sources, needEntry) => ({
    name: name,
    type: isEmscripten ? 'exe' : 'node',
    sources: [...(needEntry ? (sources.push('../test/entry_point.c'), sources) : sources)/* , ...(isEmscripten ? ['../src/emnapi.c'] : []) */],
    emwrap: {
      exports: ['emnapi']
    },
    libs: ['testcommon', ...(isEmscripten ? ['napi'] : [])],
    includePaths: isEmscripten ? ['../include'] : [],
    compileOptions: [...compilerFlags],
    // eslint-disable-next-line no-template-curly-in-string
    linkOptions: [...linkerFlags, ...(isEmscripten ? ['--js-library=${CMAKE_CURRENT_SOURCE_DIR}/../dist/library_napi.js'] : [])]
  })

  const createNodeAddonApiTarget = (name, sources) => ({
    name: name,
    type: isEmscripten ? 'exe' : 'node',
    sources: [...sources/* , ...(isEmscripten ? ['./src/emnapi.c'] : []) */],
    emwrap: {
      exports: ['emnapi']
    },
    libs: [...(isEmscripten ? ['napi'] : [])],
    includePaths: isEmscripten ? ['../include'] : [],
    defines: ['NAPI_DISABLE_CPP_EXCEPTIONS', 'NODE_ADDON_API_ENABLE_MAYBE'],
    compileOptions: [...compilerFlags],
    // eslint-disable-next-line no-template-curly-in-string
    linkOptions: [...linkerFlags, ...(isEmscripten ? ['--js-library=${CMAKE_CURRENT_SOURCE_DIR}/../dist/library_napi.js'] : [])]
  })

  return {
    project: 'emnapitest',
    targets: [
      {
        type: 'lib',
        name: 'testcommon',
        sources: ['../test/common.c'],
        includePaths: isEmscripten
          ? ['../include']
          : [`${require('path').join(require('os').homedir(), 'AppData/Local/node-gyp/Cache', process.versions.node, 'include/node')}`],
        compileOptions: [...compilerFlags],
        linkOptions: [...linkerFlags]
      },
      ...(isEmscripten
        ? [{
            type: 'lib',
            name: 'napi',
            sources: ['../src/emnapi.c'],
            includePaths: ['../include'],
            compileOptions: [...compilerFlags],
            linkOptions: [...linkerFlags]
          }]
        : []),
      createTarget('env', ['../test/env/binding.c']),
      createTarget('hello', ['../test/hello/binding.c']),
      createTarget('arg', ['../test/arg/binding.c'], true),
      createTarget('callback', ['../test/callback/binding.c'], true),
      createTarget('objfac', ['../test/objfac/binding.c'], true),
      createTarget('fnfac', ['../test/fnfac/binding.c'], true),
      createTarget('general', ['../test/general/binding.c'], true),
      createTarget('string', ['../test/string/binding.c'], true),
      createTarget('property', ['../test/property/binding.c'], true),
      createTarget('promise', ['../test/promise/binding.c'], true),
      createTarget('object', ['../test/object/test_null.c', '../test/object/test_object.c'], true),
      createTarget('objwrap', ['../test/objwrap/myobject.cc'], true),
      createTarget('bigint', ['../test/bigint/binding.c'], true),
      createTarget('fnwrap', ['../test/fnwrap/myobject.cc', '../test/fnwrap/binding.cc'], true),
      createTarget('passwrap', ['../test/passwrap/myobject.cc', '../test/passwrap/binding.cc'], true),
      createTarget('array', ['../test/array/binding.c'], true),
      createTarget('constructor', ['../test/constructor/binding.c'], true),
      createTarget('conversion', ['../test/conversion/test_conversions.c', '../test/conversion/test_null.c'], true),
      createTarget('dataview', ['../test/dataview/binding.c'], true),
      createTarget('date', ['../test/date/binding.c'], true),
      createTarget('error', ['../test/error/binding.c'], true),
      createTarget('exception', ['../test/exception/binding.c'], true),
      createTarget('ref', ['../test/ref/binding.c'], true),
      createTarget('ref_double_free', ['../test/ref_double_free/binding.c'], true),
      createTarget('function', ['../test/function/binding.c'], true),
      createTarget('scope', ['../test/scope/binding.c'], true),
      createTarget('newtarget', ['../test/newtarget/binding.c'], true),
      createTarget('number', ['../test/number/binding.c'], true),
      createTarget('symbol', ['../test/symbol/binding.c'], true),
      createTarget('typedarray', ['../test/typedarray/binding.c'], true),
      createTarget('emnapi', ['../test/emnapi/binding.c'], true),
      createTarget('version', ['../test/version/binding.c']),

      createNodeAddonApiTarget('n_hello', ['../test/node-addon-api/hello/binding.cc'])
    ]
  }
}
