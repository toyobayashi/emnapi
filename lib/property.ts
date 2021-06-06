function napi_set_named_property (env: napi_env, object: napi_value, name: const_char_p, value: napi_value): emnapi.napi_status {
  if (!emnapi.checkEnv(env)) return emnapi.napi_status.napi_invalid_arg
  const envObject = emnapi.envStore.get(env)!
  if (envObject.tryCatch.hasCaught()) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_pending_exception)
  emnapi.napi_clear_last_error(env)
  if (value === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  if (object === emnapi.NULL) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
  try {
    const maybeObject = envObject.handleStore.get(object)!.value
    if (typeof maybeObject !== 'object' || maybeObject === null) {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
    }
    if (name === emnapi.NULL) {
      return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
    }
    envObject.handleStore.get(object)!.value[UTF8ToString(name)] = envObject.handleStore.get(value)!.value
  } catch (err) {
    envObject.tryCatch.setError(err)
  }
  return emnapi.getReturnStatus(env)
}

emnapiImplement('napi_set_named_property', napi_set_named_property)
