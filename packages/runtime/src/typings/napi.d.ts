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
  error_code: napi_status
}

declare interface napi_property_descriptor {
  // One of utf8name or name should be NULL.
  utf8name: const_char_p
  name: napi_value

  method: napi_callback
  getter: napi_callback
  setter: napi_callback
  value: napi_value
  /* napi_property_attributes */
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

declare const enum napi_status {
  napi_ok,
  napi_invalid_arg,
  napi_object_expected,
  napi_string_expected,
  napi_name_expected,
  napi_function_expected,
  napi_number_expected,
  napi_boolean_expected,
  napi_array_expected,
  napi_generic_failure,
  napi_pending_exception,
  napi_cancelled,
  napi_escape_called_twice,
  napi_handle_scope_mismatch,
  napi_callback_scope_mismatch,
  napi_queue_full,
  napi_closing,
  napi_bigint_expected,
  napi_date_expected,
  napi_arraybuffer_expected,
  napi_detachable_arraybuffer_expected,
  napi_would_deadlock // unused
}

declare const enum napi_property_attributes {
  napi_default = 0,
  napi_writable = 1 << 0,
  napi_enumerable = 1 << 1,
  napi_configurable = 1 << 2,

  // Used with napi_define_class to distinguish static properties
  // from instance properties. Ignored by napi_define_properties.
  napi_static = 1 << 10,

  /// #ifdef NAPI_EXPERIMENTAL
  // Default for class methods.
  napi_default_method = napi_writable | napi_configurable,

  // Default for object properties, like in JS obj[prop].
  napi_default_jsproperty = napi_writable | napi_enumerable | napi_configurable
  /// #endif  // NAPI_EXPERIMENTAL
}

declare const enum napi_valuetype {
  napi_undefined,
  napi_null,
  napi_boolean,
  napi_number,
  napi_string,
  napi_symbol,
  napi_object,
  napi_function,
  napi_external,
  napi_bigint
}

declare const enum napi_typedarray_type {
  napi_int8_array,
  napi_uint8_array,
  napi_uint8_clamped_array,
  napi_int16_array,
  napi_uint16_array,
  napi_int32_array,
  napi_uint32_array,
  napi_float32_array,
  napi_float64_array,
  napi_bigint64_array,
  napi_biguint64_array
}

declare const enum napi_key_collection_mode {
  napi_key_include_prototypes,
  napi_key_own_only
}

declare const enum napi_key_filter {
  napi_key_all_properties = 0,
  napi_key_writable = 1,
  napi_key_enumerable = 1 << 1,
  napi_key_configurable = 1 << 2,
  napi_key_skip_strings = 1 << 3,
  napi_key_skip_symbols = 1 << 4
}

declare const enum napi_key_conversion {
  napi_key_keep_numbers,
  napi_key_numbers_to_strings
}
