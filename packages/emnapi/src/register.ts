/* function napi_module_register (nodeModule: Pointer<node_module>): void {
  if (nodeModule === emnapi.NULL) return

  const addr = nodeModule >> 2
  // const nm_version = HEAP32[addr]
  // const nm_flags = HEAP32[addr + 1]
  // const nm_filename = HEAP32[addr + 2]

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const nm_register_func = HEAP32[addr + 3]

  const nm_modname = HEAP32[addr + 4]
  const modName = UTF8ToString(nm_modname) || 'emnapiExports'
  // const nm_priv = HEAP32[addr + 5]
  // const reserved = HEAP32[addr + 6]

  const env = emnapi.Env.create()
  emnapi.initErrorMemory()

  env.callInNewHandleScope((scope) => {
    const exports = {}
    const exportsHandle = scope.add(exports)

    const napiValue = emnapi.call_iii(nm_register_func, env.id, exportsHandle.id)
    Module[modName] = env.handleStore.get(napiValue)!.value
  })
  if (env.tryCatch.hasCaught()) {
    const err = env.tryCatch.extractException()!
    throw err
  }
  // console.log(env.handleStore.allId())
}

emnapiImplement('napi_module_register', napi_module_register) */
