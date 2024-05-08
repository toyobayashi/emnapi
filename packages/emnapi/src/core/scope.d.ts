declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
  childThread?: boolean
  reuseWorker?: boolean
  asyncWorkPoolSize?: number
  waitThreadStart?: boolean
  onCreateWorker?: () => any
  print?: (str: string) => void
  printErr?: (str: string) => void
  postMessage?: (msg: any) => any
}

// factory parameter
declare const options: CreateOptions

declare const wasiThreads: typeof import('../../../wasi-threads/lib/typings/index')

declare type ThreadManagerOptions = import('../../../wasi-threads/lib/typings/index').ThreadManagerOptions
declare type ThreadManager = import('../../../wasi-threads/lib/typings/index').ThreadManager
