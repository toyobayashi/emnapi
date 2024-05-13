declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
  childThread?: boolean
  reuseWorker?: boolean
  asyncWorkPoolSize?: number
  waitThreadStart?: boolean | number
  onCreateWorker?: () => any
  print?: (str: string) => void
  printErr?: (str: string) => void
  postMessage?: (msg: any) => any
}

// factory parameter
declare const options: CreateOptions

declare type ThreadManagerOptions = import('../../../wasi-threads/lib/typings/index').ThreadManagerOptions
declare const ThreadManager: typeof import('../../../wasi-threads/lib/typings/index').ThreadManager
// eslint-disable-next-line @typescript-eslint/no-redeclare
declare type ThreadManager = import('../../../wasi-threads/lib/typings/index').ThreadManager
