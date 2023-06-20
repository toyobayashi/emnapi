function _napi_get_version (env: napi_env, result: Pointer<uint32_t>): napi_status {
  $CHECK_ENV!(env)
  const envObject = emnapiCtx.envStore.get(env)!
  $CHECK_ARG!(envObject, result)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const NODE_API_MODULE_API_VERSION = Version.NODE_API_MODULE_API_VERSION
  $makeSetValue('result', 0, 'NODE_API_MODULE_API_VERSION', 'u32')
  return envObject.clearLastError()
}

emnapiImplement('napi_get_version', 'ipp', _napi_get_version, [])
