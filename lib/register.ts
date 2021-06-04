mergeInto(LibraryManager.library, {
  napi_module_register__deps: [
    '$emnapi'
  ],
  napi_module_register: function (nodeModule: Pointer<node_module>): void {
    const addr = nodeModule >> 2
    // const nm_version = HEAPU32[addr]
    // const nm_flags = HEAPU32[addr + 1]
    // const nm_filename = HEAPU32[addr + 2]
    const nm_register_func = HEAPU32[addr + 3]
    // const nm_modname = HEAPU32[addr + 4]
    // const nm_priv = HEAPU32[addr + 5]

    emnapi.callInNewHandleScope((scope) => {
      const exports = {}
      const exportsHandle = scope.add(exports)

      const napiValue = dynCall_iii(nm_register_func, 0, exportsHandle.id)
      Module['napiExports'] = emnapi.Handle.store[napiValue].value
    })
    // console.log(emnapi.Handle.store)
  }
})
