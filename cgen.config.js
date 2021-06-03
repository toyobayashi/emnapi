module.exports = function (_options, { isDebug }) {
  const debugFlags = [
    '-sDISABLE_EXCEPTION_CATCHING=0',
    '-sSAFE_HEAP=1'
  ]

  const commonFlags = [
    '--bind',
    '-sDYNCALLS=1',
    // '-sERROR_ON_UNDEFINED_SYMBOLS=0', if add js function to imports.env
    '-sALLOW_MEMORY_GROWTH=1',
    ...(isDebug ? debugFlags : [])
  ]

  return {
    project: 'napi',
    targets: [
      {
        name: 'napitest',
        type: 'exe',
        sources: [
          './src/main.c',
          './src/lib.c'
        ],
        emwrap: { // compatible webpack
          // wrapScript: './export.js'
        },
        includePaths: ['./include'],
        compileOptions: [...commonFlags],
        linkOptions: [...commonFlags, '--js-library=${CMAKE_CURRENT_SOURCE_DIR}/dist/library_napi.js']
      }
    ]
  }
}
