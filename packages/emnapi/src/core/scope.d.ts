declare interface CreateOptions {
  context: Context
  filename?: string
  nodeBinding?: NodeBinding
  childThread?: boolean
  reuseWorker?: ThreadManagerOptionsMain['reuseWorker']
  asyncWorkPoolSize?: number
  waitThreadStart?: MainThreadBaseOptions['waitThreadStart']
  onCreateWorker?: () => any
  print?: (str: string) => void
  printErr?: (str: string) => void
  postMessage?: (msg: any) => any
}

// factory parameter
declare const options: CreateOptions

declare type MainThreadBaseOptions = import('../../../wasi-threads/dist/types/index').MainThreadBaseOptions
declare type ThreadManagerOptionsMain = import('../../../wasi-threads/dist/types/index').ThreadManagerOptionsMain
declare const ThreadManager: typeof import('../../../wasi-threads/dist/types/index').ThreadManager
// eslint-disable-next-line @typescript-eslint/no-redeclare
declare type ThreadManager = import('../../../wasi-threads/dist/types/index').ThreadManager
