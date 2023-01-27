export declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
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
  envObject?: Env

  init (instance: WebAssembly.Instance, memory?: WebAssembly.Memory, table?: WebAssembly.Table): any
}

export function createNapiModule (options: CreateOptions): NapiModule
