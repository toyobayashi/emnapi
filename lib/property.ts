function napi_set_named_property (env: napi_env, object: napi_value, name: const_char_p, value: napi_value): emnapi.napi_status {
  return emnapi.preamble(env, (envObject) => {
    return emnapi.checkArgs(env, [value, object], () => {
      const maybeObject = envObject.handleStore.get(object)!.value
      if (typeof maybeObject !== 'object' || maybeObject === null) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_object_expected)
      }
      if (name === emnapi.NULL) {
        return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_invalid_arg)
      }
      envObject.handleStore.get(object)!.value[UTF8ToString(name)] = envObject.handleStore.get(value)!.value
      return emnapi.napi_status.napi_ok
    })
  })
}

emnapiImplement('napi_set_named_property', napi_set_named_property)
