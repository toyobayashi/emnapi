export type { ThreadManagerOptions, WorkerLike, WorkerMessageEvent, WorkerFactory } from './thread-manager'
export { ThreadManager } from './thread-manager'

export type {
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
export type { InstantiatePayload, ThreadMessageHandlerOptions } from './worker'

export { createInstanceProxy } from './proxy'
