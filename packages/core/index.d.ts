import type { Context } from '@emnapi/runtime'

export declare type CreateOptions = {
  filename?: string
  nodeBinding?: {
    node: {
      emitAsyncInit: Function
      emitAsyncDestroy: Function
      makeCallback: Function
    }
    napi: {
      asyncInit: Function
      asyncDestroy: Function
      makeCallback: Function
    }
  }
  onCreateWorker?: () => any
  print?: () => void
  printErr?: () => void
} & ({
  context: Context
  childThread?: false
} | {
  context?: Context
  childThread: true
})

export declare interface PointerInfo {
  address: number
  ownership: 0 | 1
  runtimeAllocated: 0 | 1
}

export declare interface InitOptions {
  instance: WebAssembly.Instance
  module: WebAssembly.Module
  memory?: WebAssembly.Memory
  table?: WebAssembly.Table
}

export declare interface NapiModule<ChildThread extends boolean> {
  imports: {
    env: any
    napi: any
    emnapi: any
  }
  exports: any
  loaded: boolean
  filename: string
  childThread: ChildThread
  emnapi: {
    syncMemory<T extends ArrayBuffer | ArrayBufferView> (
      js_to_wasm: boolean,
      arrayBufferOrView: T,
      offset?: number,
      len?: int
    ): T
    getMemoryAddress (arrayBufferOrView: ArrayBuffer | ArrayBufferView): PointerInfo
  }

  init (options: InitOptions): any
}

export declare function createNapiModule<T extends CreateOptions> (
  options: T
): NapiModule<[T['childThread']] extends [boolean] ? T['childThread'] : false>

export declare type LoadOptions<ChildThread extends boolean> = {
  wasi?: {
    readonly wasiImport?: Record<string, any>
    initialize (instance: object): void
    getImportObject? (): any
  }
  overwriteImports?: (importObject: WebAssembly.Imports) => WebAssembly.Imports
  postMessage?: (msg: any) => any
} & (
  [ChildThread] extends [true]
    ? {
        tid: number
        arg: number
      }
    : {})

export declare function loadNapiModule (
  napiModule: NapiModule<false>,
  wasmInput: string | URL | BufferSource | WebAssembly.Module,
  options?: LoadOptions<false>
): Promise<WebAssembly.WebAssemblyInstantiatedSource>
export declare function loadNapiModule (
  napiModule: NapiModule<true>,
  wasmInput: string | URL | BufferSource | WebAssembly.Module,
  options: LoadOptions<true>
): Promise<WebAssembly.WebAssemblyInstantiatedSource>

export declare function loadNapiModuleSync (
  napiModule: NapiModule<false>,
  wasmInput: string | URL | BufferSource | WebAssembly.Module,
  options?: LoadOptions<false>
): WebAssembly.WebAssemblyInstantiatedSource
export declare function loadNapiModuleSync (
  napiModule: NapiModule<true>,
  wasmInput: string | URL | BufferSource | WebAssembly.Module,
  options: LoadOptions<true>
): WebAssembly.WebAssemblyInstantiatedSource

export declare function handleMessage (msg: { data: any }, callback: (type: string, payload: any) => any): void
