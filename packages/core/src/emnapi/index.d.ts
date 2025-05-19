import type { Context, ReferenceOwnership } from '@emnapi/runtime'
import type { ThreadManager, ThreadManagerOptionsMain, MainThreadBaseOptions } from '@emnapi/wasi-threads'

/** @public */
export declare interface PointerInfo {
  address: number
  ownership: ReferenceOwnership
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
    addSendListener (worker: any): boolean
  }

  init (options: InitOptions): any
  initWorker (arg: number): void
  executeAsyncWork (work: number): void
  postMessage?: (msg: any) => any

  waitThreadStart: boolean | number
  /** @internal */
  PThread: ThreadManager
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
  name: string
}

/** @public */
export declare interface PluginContext {
  wasmMemory: () => WebAssembly.Memory
  wasmTable: () => WebAssembly.Table
  emnapiCtx: Context
  emnapiString: any // TODO
}

/** @public */
export declare interface EmnapiPlugin {
  importObject?: (originalImports: WebAssembly.Imports) => (WebAssembly.Imports | void)
}

/** @public */
export declare type PluginFactory = (ctx: PluginContext) => EmnapiPlugin

/** @public */
export declare type BaseCreateOptions = {
  filename?: string
  nodeBinding?: NodeBinding
  reuseWorker?: ThreadManagerOptionsMain['reuseWorker']
  asyncWorkPoolSize?: number
  waitThreadStart?: MainThreadBaseOptions['waitThreadStart']
  onCreateWorker?: (info: CreateWorkerInfo) => any
  print?: (str: string) => void
  printErr?: (str: string) => void
  postMessage?: (msg: any) => any
  plugins?: (PluginFactory | EmnapiPlugin)[]
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
