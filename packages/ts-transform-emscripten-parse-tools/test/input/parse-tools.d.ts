// Minimal declarations corresponding to packages/emnapi/src/typings/parse-tools.d.ts.
declare module 'emscripten:parse-tools' {
  export type ValType = 'i8' | 'u8' | 'i16' | 'i32' | 'u32' | 'i64' | 'double' | '*'

  export function from64 (value: string): void
  export function to64 (value: string): number | bigint
  export function makeGetValue (ptr: string, pos: number | string, type: ValType | 'SIZE_TYPE' | 'POINTER_WASM_TYPE'): number | bigint
  export function makeSetValue (ptr: string, pos: number | string, value: string, type: ValType | 'SIZE_TYPE' | 'POINTER_WASM_TYPE'): void
  export function makeDynCall (signature: string, ptr: string): (...args: any[]) => any

  export const POINTER_SIZE: number
  export const SIZE_TYPE: 'u32' | 'u64'
  export const POINTER_WASM_TYPE: 'i32' | 'i64'
}
