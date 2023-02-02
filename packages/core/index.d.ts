export declare interface CreateOptions {
  context: import('@tybys/emnapi-runtime').Context
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

export declare interface NapiModule {
  imports: {
    env: any
    napi: any
    emnapi: any
  }
  exports: any
  loaded: boolean
  filename: string

  init (instance: WebAssembly.Instance, memory?: WebAssembly.Memory, table?: WebAssembly.Table): any
}

export function createNapiModule (options: CreateOptions): NapiModule
