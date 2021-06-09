declare const LibraryManager: {
  library: any
}

declare function mergeInto (target: any, source: { [key: string]: any }): void

// fake
declare function makeDynCall (sig: 'iii', ptr: string): (a: int32_t, b: int32_t) => int32_t
declare function makeDynCall (sig: 'viii', ptr: string): (a: int32_t, b: int32_t, c: int32_t) => void
declare function makeDynCall (sig: string, ptr: string): (...args: any[]) => any
