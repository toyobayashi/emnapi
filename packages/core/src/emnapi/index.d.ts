import type { Context } from '@emnapi/runtime'

/** @public */
export declare interface PointerInfo {
  address: number
  ownership: 0 | 1
  runtimeAllocated: 0 | 1
}

/** @public */
export declare interface InitOptions {
  instance: WebAssembly.Instance
  module: WebAssembly.Module
  memory?: WebAssembly.Memory
  table?: WebAssembly.Table
}

/** @public */
export declare interface NapiModule {
  imports: {
    env: any
    napi: any
    emnapi: any
  }
  exports: any
  loaded: boolean
  filename: string
  childThread: boolean
  emnapi: {
    syncMemory<T extends ArrayBuffer | ArrayBufferView> (
      js_to_wasm: boolean,
      arrayBufferOrView: T,
      offset?: number,
      len?: number
    ): T
    getMemoryAddress (arrayBufferOrView: ArrayBuffer | ArrayBufferView): PointerInfo
  }

  init (options: InitOptions): any
  spawnThread (startArg: number, errorOrTid?: number): number
  startThread (tid: number, startArg: number): void
  initWorker (arg: number): void
  executeAsyncWork (work: number): void
  postMessage?: (msg: any) => any
}

/** @public */
export declare interface NodeBinding {
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

/** @public */
export declare interface CreateWorkerInfo {
  type: 'thread' | 'async-work'
}

/** @public */
export declare type BaseCreateOptions = {
  filename?: string
  nodeBinding?: NodeBinding
  reuseWorker?: boolean
  asyncWorkPoolSize?: number
  onCreateWorker?: (info: CreateWorkerInfo) => any
  print?: (str: string) => void
  printErr?: (str: string) => void
  postMessage?: (msg: any) => any
}

/** @public */
export declare type CreateOptions = BaseCreateOptions & ({
  context: Context
  childThread?: boolean
} | {
  context?: Context
  childThread: true
})

/** @public */
export declare function createNapiModule (
  options: CreateOptions
): NapiModule
