module.exports = function (_options, { isDebug, isEmscripten }) {
  const debugFlags = isEmscripten
    ? [
        '-sDISABLE_EXCEPTION_CATCHING=0',
        '-sSAFE_HEAP=1'
      ]
    : []

  const commonFlags = isEmscripten
    ? [
        '--bind',
        '-sDYNCALLS=1',
        // '-sERROR_ON_UNDEFINED_SYMBOLS=0', if add js function to imports.env
        '-sALLOW_MEMORY_GROWTH=1',
        ...(isDebug ? debugFlags : [])
      ]
    : []

  return {
    project: 'emnapitest',
    targets: [
      {
        name: 'c2napi',
        type: isEmscripten ? 'exe' : 'node',
        sources: [
          './test/c2napi/binding.c'
        ],
        emwrap: {},
        includePaths: isEmscripten ? ['./include'] : [],
        compileOptions: [...commonFlags],
        // eslint-disable-next-line no-template-curly-in-string
        linkOptions: [...commonFlags, ...(isEmscripten ? ['--js-library=${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js'] : [])]
      }
    ]
  }
}
