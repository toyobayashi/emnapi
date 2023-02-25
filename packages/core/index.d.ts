import type { Context } from '@emnapi/runtime'

export declare interface CreateOptions {
  context: Context
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
}

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

export declare interface NapiModule {
  imports: {
    env: any
    napi: any
    emnapi: any
  }
  exports: any
  loaded: boolean
  filename: string
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

export function createNapiModule (options: CreateOptions): NapiModule
