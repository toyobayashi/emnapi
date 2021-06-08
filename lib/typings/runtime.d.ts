declare interface IDynamicCalls {
  call_iii (_ptr: number, a: int32_t, b: int32_t): int32_t
  call_viii (_ptr: number, a: int32_t, b: int32_t, c: int32_t): void
}
declare function emnapiGetDynamicCalls (): IDynamicCalls

declare const HEAPU32: Uint32Array
declare const HEAP32: Int32Array
declare const HEAPF64: Float64Array
declare const HEAPU8: Uint8Array
declare const wasmTable: WebAssembly.Table

declare function UTF8ToString (ptr: const_char_p, maxRead?: number): string

declare const Module: any

declare function allocateUTF8 (str: string): char_p
declare function _malloc (size: number): void_p

declare type LifecycleCallback<Arg> = {
  func: (arg: Arg) => void
  arg: Arg
}
declare function addOnInit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void
declare function addOnExit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void

declare interface ICallbackInfo {
  _this: any
  _data: void_p
  _length: number
  _args: any[],
  _newTarget: Function | undefined,
  _isConstructCall: boolean
}
