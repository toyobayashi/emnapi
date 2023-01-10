module.exports = function (_options, { isDebug, isEmscripten }) {
  const compilerFlags = isEmscripten
    ? [
        // ...(isDebug ? ['-sDISABLE_EXCEPTION_CATCHING=0'] : [])
      ]
    : []

  const linkerFlags = isEmscripten
    ? [
        "-sEXPORTED_FUNCTIONS=['_malloc','_free']",
        '-sALLOW_MEMORY_GROWTH=1',
        '-sMIN_CHROME_VERSION=48',
        ...(isDebug ? ['-sSAFE_HEAP=1'/* , '-sDISABLE_EXCEPTION_CATCHING=0' */] : [])
      ]
    : []

  const createTarget = (name, sources) => ({
    name,
    type: 'exe',
    sources: [...sources],
    emwrap: {},
    libs: ['emnapi', 'fib'],
    compileOptions: [...compilerFlags],
    // eslint-disable-next-line no-template-curly-in-string
    linkOptions: [...linkerFlags]
  })

  const createNodeAddonApiTarget = (name, sources) => ({
    name,
    type: 'exe',
    sources: [...sources],
    emwrap: {},
    libs: ['emnapi', 'fib'],
    defines: ['NAPI_DISABLE_CPP_EXCEPTIONS', 'NODE_ADDON_API_ENABLE_MAYBE'],
    compileOptions: [...compilerFlags],
    // eslint-disable-next-line no-template-curly-in-string
    linkOptions: [...linkerFlags]
  })

  return {
    project: 'emnapibench',
    targets: [
      {
        type: 'lib',
        name: 'fib',
        sources: ['./src/fib.c'],
        compileOptions: [...compilerFlags]
      },
      {
        type: 'lib',
        name: 'emnapi',
        sources: ['../emnapi/src/emnapi.c'],
        publicIncludePaths: ['../emnapi/include'],
        compileOptions: [...compilerFlags],
        publicLinkOptions: [`--js-library=${require('path').join(__dirname, '../emnapi/dist/library_napi.js')}`]
      },
      {
        name: 'embindcpp',
        type: 'exe',
        sources: ['./src/bind.cpp'],
        emwrap: {},
        libs: ['embind', 'fib'],
        compileOptions: [...compilerFlags],
        // eslint-disable-next-line no-template-curly-in-string
        linkOptions: [...linkerFlags]
      },
      createTarget('emnapic', ['./src/lib.c']),
      createNodeAddonApiTarget('emnapicpp', ['./src/lib.cpp'])
    ]
  }
}
