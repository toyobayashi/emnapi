declare type napi_env = Pointer<unknown>

declare type napi_value = Pointer<unknown>
declare type napi_ref = Pointer<unknown>
declare type napi_deferred = Pointer<unknown>
declare type napi_handle_scope = Pointer<unknown>
declare type napi_escapable_handle_scope = Pointer<unknown>

declare type napi_addon_register_func = FunctionPointer<(env: napi_env, exports: napi_value) => napi_value>

declare type napi_callback_info = Pointer<unknown>
declare type napi_callback = FunctionPointer<(env: napi_env, info: napi_callback_info) => napi_value>

declare interface napi_extended_error_info {
  error_message: const_char_p
  engine_reserved: void_p
  engine_error_code: uint32_t
  error_code: number
}

declare interface napi_property_descriptor {
  // One of utf8name or name should be NULL.
  utf8name: const_char_p
  name: napi_value

  method: napi_callback
  getter: napi_callback
  setter: napi_callback
  value: napi_value
  /* emnapi.napi_property_attributes */
  attributes: number
  data: void_p
}

declare type napi_finalize = FunctionPointer<(
  env: napi_env,
  finalize_data: void_p,
  finalize_hint: void_p
) => void>

declare interface node_module {
  nm_version: int32_t
  nm_flags: uint32_t
  nm_filename: Pointer<const_char>
  nm_register_func: napi_addon_register_func
  nm_modname: Pointer<const_char>
  nm_priv: Pointer<void>
  reserved: PointerPointer<void>
}

declare interface napi_node_version {
  major: uint32_t
  minor: uint32_t
  patch: uint32_t
  release: const_char_p
}

declare interface emnapi_emscripten_version {
  major: uint32_t
  minor: uint32_t
  patch: uint32_t
}
