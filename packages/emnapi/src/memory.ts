function napi_adjust_external_memory (env: napi_env, _low: int32_t, _high: int32_t, _result: Pointer<int64_t>): napi_status {
  return _napi_set_last_error(env, napi_status.napi_generic_failure, 0, 0)
}

emnapiImplement('napi_adjust_external_memory', napi_adjust_external_memory, ['napi_set_last_error'])
