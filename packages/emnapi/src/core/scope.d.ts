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
  /**
   * Must synchronously enqueue the message or throw before enqueueing it.
   * The `any` return type is retained for v1 API compatibility; Promise-like
   * transports are unsupported because this channel is not idempotent.
   */
  postMessage?: (msg: any) => any
}

// factory parameter
declare const options: CreateOptions

declare type MainThreadBaseOptions = import('../../../wasi-threads/lib/typings/index').MainThreadBaseOptions
declare type ThreadManagerOptionsMain = import('../../../wasi-threads/lib/typings/index').ThreadManagerOptionsMain
declare const ThreadManager: typeof import('../../../wasi-threads/lib/typings/index').ThreadManager
// eslint-disable-next-line @typescript-eslint/no-redeclare
declare type ThreadManager = import('../../../wasi-threads/lib/typings/index').ThreadManager
