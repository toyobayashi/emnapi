// compiler
declare const LibraryManager: {
  library: any
}

declare function mergeInto (target: any, source: Record<string, any>): void

// runtime
declare var wasmMemory: WebAssembly.Memory
declare var wasmTable: WebAssembly.Table
declare var ENVIRONMENT_IS_NODE: boolean
declare var ENVIRONMENT_IS_PTHREAD: boolean

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
declare function _malloc (size: number | bigint): void_p

// declare type LifecycleCallback<Arg> = {
//   func: (arg: Arg) => void
//   arg: Arg
// }
// declare const __ATINIT__: Array<(Module: any) => void>
// declare function addOnInit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void
// declare function addOnExit (callback: number | ((Module: any) => void) | LifecycleCallback<any>): void
declare function abort (msg?: string): never

declare function runtimeKeepalivePush (): void
declare function runtimeKeepalivePop (): void
