export type {
  ReuseWorkerOptions,
  ThreadManagerOptionsBase,
  ThreadManagerOptionsMain,
  ThreadManagerOptionsChild,
  ThreadManagerOptions,
  WorkerLike,
  WorkerMessageEvent,
  WorkerFactory
} from './thread-manager'
export { ThreadManager } from './thread-manager'

export type {
  WASIInstance,
  StartResult,
  WASIThreadsOptions,
  MainThreadOptions,
  ChildThreadOptions,
  BaseOptions,
  WASIThreadsImports,
  MainThreadBaseOptions,
  MainThreadOptionsWithThreadManager,
  MainThreadOptionsCreateThreadManager
} from './wasi-threads'
export { WASIThreads } from './wasi-threads'

export { ThreadMessageHandler } from './worker'
export type { ThreadMessageHandlerOptions } from './worker'

export { createInstanceProxy } from './proxy'

export { isTrapError } from './util'

export type { LoadPayload } from './command'
