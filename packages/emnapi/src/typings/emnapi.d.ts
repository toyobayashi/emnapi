/// <reference lib="esnext.float16" />

declare type Env = import('../../../runtime/dist/types/index').Env
declare type NodeEnv = import('../../../runtime/dist/types/index').NodeEnv
// declare type Handle<S> = import('../../../runtime/dist/types/index').Handle<S>
declare type Context = import('../../../runtime/dist/types/index').Context
declare type Reference = import('../../../runtime/dist/types/index').Reference
declare type Resolver<T> = import('../../../runtime/dist/types/index').Resolver<T>
declare type FunctionTemplate = import('../../../runtime/dist/types/index').FunctionTemplate

declare type NodeBinding = typeof import('../../../node/index')

declare interface BaseStruct {
  __size__: number
}

declare interface SNapiExtendedErrorInfo extends BaseStruct {
  error_message: number
  engine_reserved: number
  engine_error_code: number
  error_code: number
}

declare interface SNapiEnv extends BaseStruct {
  reserved: number
  sentinel: number
  js_vtable: number
  module_vtable: number
  last_error: SNapiExtendedErrorInfo
}
