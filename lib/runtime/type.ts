// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export enum napi_status {
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

  export enum napi_property_attributes {
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

  export enum napi_valuetype {
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
}
