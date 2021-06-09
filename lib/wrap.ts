function napi_wrap (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.wrap(emnapi.WrapType.retrievable, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

function napi_unwrap (env: napi_env, js_object: napi_value, result: void_pp): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.unwrap(env, js_object, result, emnapi.UnwrapAction.KeepWrap)
}

function napi_remove_wrap (env: napi_env, js_object: napi_value, result: void_pp): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.unwrap(env, js_object, result, emnapi.UnwrapAction.RemoveWrap)
}

function napi_add_finalizer (env: napi_env, js_object: napi_value, native_object: void_p, finalize_cb: napi_finalize, finalize_hint: void_p, result: Pointer<napi_ref>): emnapi.napi_status {
  if (!emnapi.supportFinalizer) return emnapi.napi_set_last_error(env, emnapi.napi_status.napi_generic_failure)
  return emnapi.wrap(emnapi.WrapType.anonymous, env, js_object, native_object, finalize_cb, finalize_hint, result)
}

emnapiImplement('napi_wrap', napi_wrap)
emnapiImplement('napi_unwrap', napi_unwrap)
emnapiImplement('napi_remove_wrap', napi_remove_wrap)
emnapiImplement('napi_add_finalizer', napi_add_finalizer)
