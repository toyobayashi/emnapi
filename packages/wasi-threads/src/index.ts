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

export { MessageHandler } from './worker'
export type { OnLoadData, HandleOptions } from './worker'

export { createInstanceProxy } from './proxy'
