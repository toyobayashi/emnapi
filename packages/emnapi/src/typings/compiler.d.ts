declare const LibraryManager: {
  library: any
}

declare function mergeInto (target: any, source: { [key: string]: any }): void

// fake
declare function $makeDynCall (sig: string, ptr: string): (...args: any[]) => any
declare function $makeMalloc (source: string, size: string | number): void_p

declare type Bit = '8' | '16' | '32' | '64'
declare type Sign = 'i' | 'u'
declare type Integer = `${Sign}${Bit}`
declare type Float = 'float' | 'double'
declare type PtrType = '*' | `${Integer | Float}*`
declare type ValType = Integer | Float | PtrType

declare function $makeGetValue (ptrVar: string, pos: number | string, type: PtrType): number
declare function $makeGetValue (ptrVar: string, pos: number | string, type: ValType): number | bigint
declare function $makeSetValue (ptrVar: string, pos: number | string, valueVar: string, type: ValType): void
declare function $getUnsharedTextDecoderView (heap: string, start: string, end: string): ArrayBufferView

declare function $from64 (x: string | string[]): void
declare function $to64 (x: string): number | bigint

declare const $POINTER_SIZE: number
declare const POINTER_SIZE: number
declare const SIZE_TYPE: 'u32' | 'u64'
declare const POINTER_WASM_TYPE: 'i32' | 'i64'
