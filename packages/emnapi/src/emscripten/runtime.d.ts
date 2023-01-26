// compiler
declare const LibraryManager: {
  library: any
}

declare function mergeInto (target: any, source: { [key: string]: any }): void

// runtime
declare const wasmMemory: WebAssembly.Memory
declare const ENVIRONMENT_IS_NODE: boolean
declare const ENVIRONMENT_IS_PTHREAD: boolean

declare function UTF8ToString (ptr: const_char_p, maxRead?: number): string
declare function UTF16ToString (ptr: const_char16_t_p, maxRead?: number): string
declare function stringToUTF8 (ptr: string, outPtr: char_p, maxBytesToWrite?: number): number
declare function stringToUTF16 (ptr: string, outPtr: char16_t_p, maxBytesToWrite?: number): number
declare function lengthBytesUTF8 (str: string): number

// declare type I64Type = 'i64'
// declare type I32Type = 'i1' | 'i8' | 'i16' | 'i32' | 'float' | 'double'
// declare type ValueType = I32Type | I64Type
// declare type PointerType = '*' | `${ValueType}*`

// declare function getValue (ptr: number): number
// declare function getValue (ptr: number, type: I64Type): bigint
// declare function getValue (ptr: number, type: I32Type | PointerType): number
// declare function setValue (ptr: number, value: number | bigint, type: ValueType | PointerType): void

declare const Module: any

// declare function allocateUTF8 (str: string): char_p
declare function _free (ptr: void_p): void

// declare type LifecycleCallback<Arg> = {
//   func: (arg: Arg) => void
//   arg: Arg
// }
// declare const __ATINIT__: Array<(Module: any) => void>
// declare function addOnInit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void
// declare function addOnExit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void
declare function abort (msg?: string): void

declare function runtimeKeepalivePush (): void
declare function runtimeKeepalivePop (): void
