declare function dynCall_iii (
  ptr: FunctionPointer<(a: int32_t, b: int32_t) => int32_t>,
  a: int32_t,
  b: int32_t
): int32_t

declare const HEAPU32: Uint32Array

declare function UTF8ToString (ptr: const_char_p, maxRead?: number): string

declare const Module: any
