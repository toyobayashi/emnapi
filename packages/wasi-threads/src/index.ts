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
export type { ThreadMessageHandlerOptions, WorkerMessageType } from './worker'

export { createInstanceProxy } from './proxy'

export { isTrapError, isSharedArrayBuffer } from './util'

export type {
  LoadPayload,
  LoadedPayload,
  StartPayload,
  CleanupThreadPayload,
  TerminateAllThreadsPayload,
  SpawnThreadPayload,
  CommandPayloadMap,
  CommandType,
  CommandInfo,
  MessageEventData
} from './command'
