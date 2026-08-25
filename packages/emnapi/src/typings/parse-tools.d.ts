declare module 'emscripten:parse-tools' {
  export function makeDynCall (sig: string, ptr: string): (...args: any[]) => any

  export type Bit = '8' | '16' | '32' | '64'
  export type Sign = 'i' | 'u'
  export type Integer = `${Sign}${Bit}`
  export type Float = 'float' | 'double'
  export type PtrType = '*' | `${Integer | Float}*`
  export type ValType = Integer | Float | PtrType

  export function makeGetValue (ptrVar: string, pos: number | string, type: PtrType): number
  export function makeGetValue (ptrVar: string, pos: number | string, type: ValType): number | bigint
  export function makeSetValue (ptrVar: string, pos: number | string, valueVar: string, type: ValType): void
  export function getUnsharedTextDecoderView (heap: string, start: string, end: string): ArrayBufferView

  export function from64 (x: string | string[]): void
  export function to64 (x: string): number | bigint

  export const POINTER_SIZE: number
  export const SIZE_TYPE: 'u32' | 'u64'
  export const POINTER_WASM_TYPE: 'i32' | 'i64'
}

// declare const POINTER_SIZE: number
// declare const SIZE_TYPE: 'u32' | 'u64'
// declare const POINTER_WASM_TYPE: 'i32' | 'i64'
