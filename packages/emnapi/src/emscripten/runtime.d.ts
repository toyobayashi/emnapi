// compiler
declare const LibraryManager: {
  library: any
}

declare function mergeInto (target: any, source: Record<string, any>): void

declare module 'emscripten:runtime' {
  export const wasmMemory: WebAssembly.Memory
  export const wasmTable: WebAssembly.Table
  export const ENVIRONMENT_IS_NODE: boolean
  export const ENVIRONMENT_IS_PTHREAD: boolean

  export function _free (ptr: void_p): void
  export function _malloc (size: number | bigint): void_p
  export function _emnapi_create_env (): void_p
  export function _emnapi_delete_env (...args: any[]): void

  export function abort (msg?: string): never

  export function runtimeKeepalivePush (): void
  export function runtimeKeepalivePop (): void

  export const Module: any
  export const PThread: any
}
