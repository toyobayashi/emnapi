export { createNapiModule } from './emnapi/index'
export {
  loadNapiModule,
  loadNapiModuleSync,
  instantiateNapiModule,
  instantiateNapiModuleSync
} from './load'

export { MessageHandler } from './worker'

declare const __VERSION__: string
export const version = __VERSION__

export type {
  PointerInfo,
  InitOptions,
  NapiModule,
  NodeBinding,
  CreateWorkerInfo,
  BaseCreateOptions,
  CreateOptions
} from './emnapi/index'

export type {
  LoadOptions,
  InstantiateOptions,
  InstantiatedSource,
  ReactorWASI
} from './load'

export type {
  InstantiatePayload,
  MessageHandlerOptions
} from './worker'

export type {
  InputType
} from './util'

export * from '@emnapi/wasi-threads'
