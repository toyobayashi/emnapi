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
   * Must synchronously enqueue the message. Before throwing for a message that
   * was not enqueued, set `error.emnapiNotDelivered = true`; unmarked failures
   * are ambiguous and thread-safe function control messages may be retried.
   * The `any` return type is retained for v1 API compatibility; Promise-like
   * transports are unsupported because this channel also carries
   * non-idempotent worker protocols.
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
