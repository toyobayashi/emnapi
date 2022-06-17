declare interface IDynamicCalls {
  call_vi (_ptr: number, a: int32_t): void
  call_ii (_ptr: number, a: int32_t): int32_t
  call_iii (_ptr: number, a: int32_t, b: int32_t): int32_t
  call_viii (_ptr: number, a: int32_t, b: int32_t, c: int32_t): void
  // call_malloc (_size: size_t): void_p
}
declare const emnapiGetDynamicCalls: IDynamicCalls

declare const HEAPU32: Uint32Array
declare const HEAP32: Int32Array
declare const HEAPF64: Float64Array
declare const HEAPU8: Uint8Array
declare const ENVIRONMENT_IS_NODE: boolean
declare const ENVIRONMENT_IS_PTHREAD: boolean
declare const wasmTable: WebAssembly.Table

declare function UTF8ToString (ptr: const_char_p, maxRead?: number): string
declare function UTF16ToString (ptr: const_char16_t_p, maxRead?: number): string
declare function stringToUTF8 (ptr: string, outPtr: char_p, maxBytesToWrite?: number): number
declare function stringToUTF16 (ptr: string, outPtr: char16_t_p, maxBytesToWrite?: number): number
declare function lengthBytesUTF8 (str: string): number

declare const Module: any

declare function stackSave (): number
declare function stackRestore (s: number): void
declare function stackAlloc (size: number): void_p
// declare function allocateUTF8 (str: string): char_p
declare function _free (ptr: void_p): void

declare type LifecycleCallback<Arg> = {
  func: (arg: Arg) => void
  arg: Arg
}
declare function addOnInit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void
declare function addOnExit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void
declare function abort (msg?: string): void

declare interface ICallbackInfo {
  _this: any
  _data: void_p
  _length: number
  _args: any[]
  _newTarget: Function | undefined
  _isConstructCall: boolean
}

declare let errorMessagesPtr: number | undefined

/* declare class FinalizationRegistry<H = any> {
  constructor (callback: (heldValue: H) => void)
  register (obj: object, heldValue: H, unregisterToken?: object): void
  unregister (unregisterToken: object): void
}

declare class WeakRef<T extends object> {
  constructor (value: T)
  deref (): T | undefined
} */
