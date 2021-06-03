declare const LibraryManager: {
  library: any
}

declare function mergeInto (target: any, source: { [key: string]: any }): void

declare type Pointer = number

declare function dynCall_iii (ptr: Pointer, a: number, b: number): number

declare const HEAPU32: Uint32Array

declare function UTF8ToString (ptr: Pointer, maxRead?: number): string

declare const Module: any
