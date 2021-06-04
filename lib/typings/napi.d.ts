/// <reference path="ctype.d.ts" />

declare type napi_env = Pointer<unknown>

declare type napi_value = Pointer<unknown>

declare type napi_addon_register_func = FunctionPointer<(env: napi_env, exports: napi_value) => napi_value>

declare type napi_callback_info = Pointer<unknown>
declare type napi_callback = FunctionPointer<(env: napi_env, info: napi_callback_info) => napi_value>

declare interface node_module {
  nm_version: int32_t
  nm_flags: uint32_t
  nm_filename: Pointer<const_char>
  nm_register_func: napi_addon_register_func
  nm_modname: Pointer<const_char>
  nm_priv: Pointer<void>
  reserved: PointerPointer<void>
}
