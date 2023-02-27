import type { Context } from '@emnapi/runtime'

export declare interface BaseCreateOptions {
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
}

export declare type CreateOptions = BaseCreateOptions & ({
  context: Context
  childThread?: false
} | {
  context?: Context
  postMessage?: (msg: any) => any
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
  spawnThread (startArg: number): number
  postMessage?: (msg: any) => any
}

export declare type ToBoolean<T> = [T] extends [never]
  ? false
  : [T] extends [boolean]
      ? T
      : T extends 0
        ? false
        : T extends ''
          ? false
          : T extends null
            ? false
            : T extends undefined
              ? false
              // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
              : T extends void
                ? false
                : true

export declare function createNapiModule<T extends CreateOptions> (
  options: T
): NapiModule<ToBoolean<T['childThread']>>

export declare interface BaseLoadOptions {
  wasi?: {
    readonly wasiImport?: Record<string, any>
    initialize (instance: object): void
    getImportObject? (): any
  }
  overwriteImports?: (importObject: WebAssembly.Imports) => WebAssembly.Imports
}

export declare type LoadOptions = BaseLoadOptions & (
  (BaseCreateOptions & ({
    context: Context
    childThread?: false
  } | {
    context?: Context
    postMessage?: (msg: any) => any
    childThread: true
    tid: number
    arg: number
  })) |
  ({
    napiModule: NapiModule<false>
  } | {
    napiModule: NapiModule<true>
    tid: number
    arg: number
  })
)

export declare type LoadInChildThread<T> = T extends LoadOptions
  ? 'napiModule' extends keyof T
    ? T['napiModule'] extends NapiModule<infer R>
      ? R
      : never
    : 'childThread' extends keyof T
      ? T['childThread']
      : never
  : never

export declare interface LoadResult<ChildThread extends boolean> extends WebAssembly.WebAssemblyInstantiatedSource {
  napiModule: NapiModule<ChildThread>
}

export declare function loadNapiModule<T extends LoadOptions> (
  wasmInput: string | URL | BufferSource | WebAssembly.Module,
  options: T
): Promise<LoadResult<ToBoolean<LoadInChildThread<T>>>>

export declare function loadNapiModuleSync<T extends LoadOptions> (
  wasmInput: string | URL | BufferSource | WebAssembly.Module,
  options: T
): LoadResult<ToBoolean<LoadInChildThread<T>>>

export declare function handleMessage (msg: { data: any }, callback: (type: string, payload: any) => any): void
