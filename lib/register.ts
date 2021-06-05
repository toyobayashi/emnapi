function napi_module_register (nodeModule: Pointer<node_module>): void {
  const addr = nodeModule >> 2
  // const nm_version = HEAPU32[addr]
  // const nm_flags = HEAPU32[addr + 1]
  // const nm_filename = HEAPU32[addr + 2]

  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nm_register_func = HEAPU32[addr + 3]

  const nm_modname = HEAPU32[addr + 4]
  const modName = UTF8ToString(nm_modname) || 'emnapiExports'
  // const nm_priv = HEAPU32[addr + 5]

  emnapi.callInNewHandleScope((scope) => {
    const exports = {}
    const exportsHandle = scope.add(exports)

    const napiValue = makeDynCall('iii', 'nm_register_func')(0, exportsHandle.id)
    Module[modName] = emnapi.Handle.store[napiValue].value
  })
  if (emnapi.tryCatch.hasCaught()) {
    const err = emnapi.tryCatch.extractException()
    throw err!
  }
  // console.log(emnapi.Handle.store)
}

emnapiImplement('napi_module_register', napi_module_register)
