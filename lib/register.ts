mergeInto(LibraryManager.library, {
  napi_module_register__deps: [
    '$emnapiInit',
    '$getCurrentScope',
    '$callInNewEscapableHandleScope',
    '$findHandleById'
  ],
  napi_module_register: function (nodeModule: Pointer): void {
    const addr = nodeModule >> 2
    // const nm_version = HEAPU32[addr]
    // const nm_flags = HEAPU32[addr + 1]
    // const nm_filename = HEAPU32[addr + 2]
    const nm_register_func = HEAPU32[addr + 3]
    // const nm_modname = HEAPU32[addr + 4]
    // const nm_priv = HEAPU32[addr + 5]

    const handleId = callInNewEscapableHandleScope((scope) => {
      const exports = {}
      const exportsHandle = new Handle(exports)
      scope.handles.push(exportsHandle)

      const napiValue = dynCall_iii(nm_register_func, 0, exportsHandle.id)
      const handle = findHandleById(napiValue)
      if (scope.handles.indexOf(handle) !== -1) {
        return scope.escape(handle).id
      } else {
        return handle.id
      }
    })

    Module['napiExports'] = Handle.store[handleId]
  }
})
