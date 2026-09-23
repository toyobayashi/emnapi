declare var emnapiString: {
  UTF8ToString (ptr: number, length: int): string
  UTF16ToString (ptr: number, length: int): string
  lengthBytesUTF8 (str: string): number
  stringToUTF8 (str: string, outPtr: number, maxBytesToWrite: number): number
  encode (str: number, autoLength: boolean, sizeLength: number, convert: (c: number) => string): string
}

declare var emnapiCtx: Context
declare var emnapiExternalMemory: EmnapiExternalMemoryContext
declare function emnapiGetHandle (value: napi_value): { status: napi_status; value?: any }

declare interface EmnapiExternalMemoryContext {
  getHEAPU8 (): Uint8Array
  getBufferFrom (): (buffer: ArrayBufferLike, byteOffset?: number, length?: number) => ArrayBufferView
  bufferByteLength (buffer: ArrayBufferLike): number
  getArrayBufferPointer (arrayBuffer: ArrayBufferLike, shouldCopy: boolean): { address: number }
  setBackingStore (backingStore: Ptr, data: Ptr, byteLength: size_t, arrayBuffer: ArrayBufferLike): void
  getBackingStoreData (backingStore: Ptr): Ptr
  getBackingStoreByteLength (backingStore: Ptr): size_t
  deleteBackingStore (backingStore: Ptr): void
  registerBufferAllocation (buffer: ArrayBufferView, address: number, length: number): void
}

declare interface PluginContext {
  readonly wasmMemory: WebAssembly.Memory
  readonly wasmTable: WebAssembly.Table
  emnapiCtx: Context
  emnapiExternalMemory: EmnapiExternalMemoryContext
  emnapiString: typeof emnapiString
}

declare var emnapiPluginCtx: PluginContext

declare module 'emscripten:runtime' {
  export const wasmMemory: WebAssembly.Memory
}
