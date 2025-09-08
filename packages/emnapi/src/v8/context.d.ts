declare var emnapiString: {
  UTF8ToString (ptr: number, length: int): string
  UTF16ToString (ptr: number, length: int): string
  lengthBytesUTF8 (str: string): number
  stringToUTF8 (str: string, outPtr: number, maxBytesToWrite: number): number
  encode (str: number, autoLength: boolean, sizeLength: number, convert: (c: number) => string): string
}

declare var emnapiCtx: Context
declare function emnapiGetHandle (value: napi_value): { status: napi_status; value?: any }

declare interface PluginContext {
  readonly wasmMemory: WebAssembly.Memory
  readonly wasmTable: WebAssembly.Table
  emnapiCtx: Context
  emnapiString: typeof emnapiString
}

declare var emnapiPluginCtx: PluginContext

declare module 'emscripten:runtime' {
  export const wasmMemory: WebAssembly.Memory
}
