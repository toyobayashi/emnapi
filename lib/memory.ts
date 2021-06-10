function napi_adjust_external_memory(env: napi_env, _low: int32_t, _high: int32_t, _result: Pointer<int64_t>): emnapi.napi_status {
  return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
}

emnapiImplement('napi_adjust_external_memory', napi_adjust_external_memory)
