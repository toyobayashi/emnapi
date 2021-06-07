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
        '-sALLOW_MEMORY_GROWTH=1',
        ...(isDebug ? debugFlags : [])
      ]
    : []

  const createTarget = (name, sources/* , needEntry */) => ({
    name: name,
    type: isEmscripten ? 'exe' : 'node',
    sources: sources,
    emwrap: {},
    libs: [
      'testcommon'/* ,
      ...(needEntry ? ['testentry'] : []) */
    ],
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
        includePaths: isEmscripten ? ['./include'] : [],
        compileOptions: [...commonFlags],
        linkOptions: [...commonFlags]
      },
      /* {
        type: 'lib',
        name: 'testentry',
        sources: ['./test/entry_point.c'],
        includePaths: isEmscripten ? ['./include'] : [],
        compileOptions: [...commonFlags],
        linkOptions: [...commonFlags]
      }, */
      createTarget('env', ['./test/env/binding.c']),
      createTarget('value', ['./test/value/binding.c']),
      createTarget('function', ['./test/function/binding.c']),
      createTarget('error', ['./test/error/binding.c']),
      createTarget('hello', ['./test/hello/binding.c']),
      createTarget('arg', ['./test/arg/binding.c', './test/entry_point.c']),
      createTarget('callback', ['./test/callback/binding.c', './test/entry_point.c'])
    ]
  }
}
