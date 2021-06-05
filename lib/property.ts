function napi_set_named_property (env: napi_env, object: napi_value, name: const_char_p, value: napi_value): emnapi.napi_status {
  if (emnapi.tryCatch.hasCaught()) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  emnapi.napi_clear_last_error(env)
  if (value === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (object === 0) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  const maybeObject = emnapi.Handle.store[object].value
  if (typeof maybeObject !== 'object' || maybeObject === null) {
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
  }
  if (name === 0) {
    return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  }
  try {
    emnapi.Handle.store[object].value[UTF8ToString(name)] = emnapi.Handle.store[value].value
  } catch (err) {
    emnapi.tryCatch.setError(err)
  }
  return emnapi.getReturnStatus(env)
}

emnapiImplement('napi_set_named_property', napi_set_named_property)
