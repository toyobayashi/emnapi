module.exports = function (_options, { isDebug, isEmscripten }) {
  const compilerFlags = isEmscripten
    ? [
        // ...(isDebug ? ['-sDISABLE_EXCEPTION_CATCHING=0'] : [])
        ...(isDebug ? ['-Wall'] : []),
        ...(process.env.MEMORY64 ? ['-sMEMORY64=1'] : [])
      ]
    : []

  const linkerFlags = isEmscripten
    ? [
        "-sEXPORTED_FUNCTIONS=['_malloc','_free']",
        '-sNODEJS_CATCH_EXIT=0',
        '-sWASM_BIGINT=1',
        '-sALLOW_MEMORY_GROWTH=1',
        '-sMIN_CHROME_VERSION=67',
        '-sSTACK_SIZE=2MB',
        '-sDEFAULT_PTHREAD_STACK_SIZE=2MB',
        ...(process.env.MEMORY64 ? ['-sMEMORY64=1'] : []),
        // '-sEXIT_RUNTIME=1',
        ...(isDebug ? ['-sSAFE_HEAP=1'/* , '-sDISABLE_EXCEPTION_CATCHING=0' */] : [])
      ]
    : []

  const includePaths = isEmscripten
    ? ['../emnapi/include']
    : [`${require('path').join(require('os').homedir(), 'AppData/Local/node-gyp/Cache', process.versions.node, 'include/node')}`, '../../node_modules/node-addon-api']

  const jsLib = `--js-library=${require('path').join(__dirname, '../emnapi/dist/library_napi.js')}`

  const emnapiTarget = (pthread) => ({
    name: pthread ? 'emnapimt' : 'emnapist',
    type: 'lib',
    sources: [
      '../emnapi/src/emnapi.c',
      ...(pthread
        ? [
            '../emnapi/src/uv/uv-common.c',
            '../emnapi/src/uv/threadpool.c',
            '../emnapi/src/uv/unix/loop.c',
            '../emnapi/src/uv/unix/thread.c',
            '../emnapi/src/uv/unix/async.c',
            '../emnapi/src/uv/unix/core.c'
          ]
        : [])
    ],
    includePaths,
    defines: ['NAPI_VERSION=8', ...(pthread ? [/* 'EMNAPI_WORKER_POOL_SIZE=2' */] : [])],
    compileOptions: [...compilerFlags, ...(pthread ? ['-sUSE_PTHREADS=1'] : [])]
  })

  const createTarget = (name, sources, needEntry, pthread, linkOptions) => ({
    name,
    type: isEmscripten ? 'exe' : 'node',
    sources: [
      ...(needEntry ? (sources.push('./entry_point.c'), sources) : sources)
    ],
    emwrap: {},
    includePaths,
    libs: ['testcommon', ...(isEmscripten ? [pthread ? 'emnapimt' : 'emnapist'] : [])],
    compileOptions: [...compilerFlags, ...(isEmscripten && pthread ? ['-sUSE_PTHREADS=1'] : [])],
    // eslint-disable-next-line no-template-curly-in-string
    linkOptions: [
      ...linkerFlags,
      ...(isEmscripten ? [jsLib] : []),
      ...(isEmscripten && pthread ? ['-sUSE_PTHREADS=1', '-sPTHREAD_POOL_SIZE=8', '-sPTHREAD_POOL_SIZE_STRICT=2'] : []),
      ...(linkOptions || [])
    ]
  })

  const createNodeAddonApiTarget = ({ name, sources, defines, enableException }) => ({
    name,
    type: isEmscripten ? 'exe' : 'node',
    sources: [
      ...sources
    ],
    emwrap: {},
    libs: [...(isEmscripten ? ['emnapimt'] : [])],
    includePaths: [
      ...includePaths,
      './node-addon-api/common'
    ],
    defines: [
      ...defines,
      ...(enableException ? [] : ['NAPI_DISABLE_CPP_EXCEPTIONS']),
      'NAPI_VERSION=8'
    ],
    compileOptions: [...new Set([
      ...compilerFlags,
      ...(isEmscripten ? ['-sUSE_PTHREADS=1'] : []),
      ...(enableException && isEmscripten && !process.env.MEMORY64 ? ['-sDISABLE_EXCEPTION_CATCHING=0'] : [])
    ])],
    // eslint-disable-next-line no-template-curly-in-string
    linkOptions: [...new Set([
      ...linkerFlags,
      ...(enableException && isEmscripten && !process.env.MEMORY64 ? ['-sDISABLE_EXCEPTION_CATCHING=0'] : []),
      ...(isEmscripten ? [jsLib, '-sUSE_PTHREADS=1', '-sPTHREAD_POOL_SIZE=8', '-sPTHREAD_POOL_SIZE_STRICT=2'] : [])
    ])]
  })

  const buildSources = [
    './node-addon-api/*.cc'
  ]/* .map(p => `./node-addon-api/${p}`) */

  return {
    project: 'emnapitest',
    targets: [
      {
        type: 'lib',
        name: 'testcommon',
        sources: ['./common.c'],
        includePaths,
        compileOptions: [...compilerFlags]
      },
      ...(isEmscripten ? [emnapiTarget(false), emnapiTarget(true)] : []),
      createTarget('env', ['./env/binding.c']),
      createTarget('hello', ['./hello/binding.c']),
      ...(!(isEmscripten && process.env.MEMORY64) ? [createTarget('string_mt', ['./string/binding.c'], true, true)] : []),
      ...(!(isEmscripten && process.env.MEMORY64) ? [createTarget('async', ['./async/binding.c'], false, true)] : []),
      ...(!(isEmscripten && process.env.MEMORY64) ? [createTarget('pool', ['./pool/binding.c'], false, true, ['--pre-js=../pool/pre.js'])] : []),
      ...(!(isEmscripten && process.env.MEMORY64) ? [createTarget('tsfn', ['./tsfn/binding.c'], false, true)] : []),
      // ...(isEmscripten ? [createTarget('tsfn', ['./tsfn/binding.c'], false, true)] : []),
      createTarget('arg', ['./arg/binding.c'], true),
      createTarget('callback', ['./callback/binding.c'], true),
      createTarget('objfac', ['./objfac/binding.c'], true),
      createTarget('fnfac', ['./fnfac/binding.c'], true),
      createTarget('general', ['./general/binding.c'], true),
      createTarget('string', ['./string/binding.c'], true),
      createTarget('property', ['./property/binding.c'], true),
      createTarget('promise', ['./promise/binding.c'], true),
      createTarget('object', ['./object/test_null.c', './object/test_object.c'], true),
      createTarget('objwrap', ['./objwrap/myobject.cc'], true),
      createTarget('bigint', ['./bigint/binding.c'], true),
      createTarget('fnwrap', ['./fnwrap/myobject.cc', './fnwrap/binding.cc'], true),
      createTarget('passwrap', ['./passwrap/myobject.cc', './passwrap/binding.cc'], true),
      createTarget('array', ['./array/binding.c'], true),
      createTarget('constructor', ['./constructor/binding.c'], true),
      createTarget('conversion', ['./conversion/test_conversions.c', './conversion/test_null.c'], true),
      createTarget('dataview', ['./dataview/binding.c'], true),
      createTarget('date', ['./date/binding.c'], true),
      createTarget('error', ['./error/binding.c'], true),
      createTarget('exception', ['./exception/binding.c'], true),
      createTarget('ref', ['./ref/binding.c'], true),
      createTarget('ref_double_free', ['./ref_double_free/binding.c'], true),
      createTarget('function', ['./function/binding.c'], true),
      createTarget('scope', ['./scope/binding.c'], true),
      createTarget('newtarget', ['./newtarget/binding.c'], true),
      createTarget('number', ['./number/binding.c'], true),
      createTarget('symbol', ['./symbol/binding.c'], true),
      createTarget('typedarray', ['./typedarray/binding.c'], true),
      createTarget('buffer', ['./buffer/binding.c'], false),
      ...(isEmscripten ? [createTarget('emnapitest', ['./emnapitest/binding.c'], true, false, ['-sEXPORTED_RUNTIME_METHODS=[\'emnapiSyncMemory\']'])] : []),
      createTarget('version', ['./version/binding.c']),

      ...(!(isEmscripten && process.env.MEMORY64)
        ? [
            createNodeAddonApiTarget({
              name: 'naa_binding',
              sources: buildSources,
              defines: [],
              enableException: true
            }),
            createNodeAddonApiTarget({
              name: 'naa_binding_noexcept',
              sources: buildSources,
              defines: [],
              enableException: false
            }),
            createNodeAddonApiTarget({
              name: 'naa_binding_noexcept_maybe',
              sources: buildSources,
              defines: ['NODE_ADDON_API_ENABLE_MAYBE'],
              enableException: false
            }),
            createNodeAddonApiTarget({
              name: 'naa_binding_custom_namespace',
              sources: buildSources,
              defines: ['NAPI_CPP_CUSTOM_NAMESPACE=cstm'],
              enableException: false
            })
          ]
        : [])
    ]
  }
}
