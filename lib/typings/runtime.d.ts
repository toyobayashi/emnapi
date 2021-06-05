declare function dynCall_iii (
  ptr: FunctionPointer<(a: int32_t, b: int32_t) => int32_t>,
  a: int32_t,
  b: int32_t
): int32_t

declare const HEAPU32: Uint32Array
declare const HEAPU8: Uint8Array

declare function UTF8ToString (ptr: const_char_p, maxRead?: number): string

declare const Module: any

declare function allocateUTF8 (str: string): char_p
declare function _malloc (size: number): void_p

// fake
declare function makeDynCall (sig: 'iii', ptr: string): (a: int32_t, b: int32_t) => int32_t
declare function makeDynCall (sig: string, ptr: string): (...args: any[]) => any
