function napi_get_version (env: napi_env, result: Pointer<int32_t>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      HEAPU32[result >> 2] = 7
      return emnapi.napi_clear_last_error(env)
    })
  })
}

function napi_get_node_version (env: napi_env, result: Pointer<Pointer<napi_node_version>>): emnapi.napi_status {
  return emnapi.checkEnv(env, () => {
    return emnapi.checkArgs(env, [result], () => {
      if (!emnapi.nodeVersionPtr) {
        emnapi.nodeVersionPtr = emnapi.call_malloc(16)
        const addr32 = emnapi.nodeVersionPtr >> 2
        HEAPU32[addr32] = 14
        HEAPU32[addr32 + 1] = 16
        HEAPU32[addr32 + 2] = 0
        HEAP32[addr32 + 3] = allocateUTF8('node')
      }
      HEAPU32[result >> 2] = emnapi.nodeVersionPtr
      return emnapi.napi_clear_last_error(env)
    })
  })
}

emnapiImplement('napi_get_version', napi_get_version)
emnapiImplement('napi_get_node_version', napi_get_node_version)
