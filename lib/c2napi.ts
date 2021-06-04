function napi_create_int32 (env: napi_env, value: int32_t, result: Pointer<napi_value>) {
  const valueHandle = emnapi.getCurrentScope().add(value)
  HEAPU32[result >> 2] = valueHandle.id
  return emnapi.napi_clear_last_error(env)
}

emnapiImplement('napi_create_int32', napi_create_int32)
