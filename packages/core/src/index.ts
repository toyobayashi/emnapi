export { createAddonModule, createNapiModule } from './emnapi/index'
export {
  loadAddon,
  loadAddonSync,
  instantiateAddon,
  instantiateAddonSync,
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
  AddonModule,
  NapiModule,
  NodeBinding,
  CreateWorkerInfo,
  BaseCreateOptions,
  CreateOptions,
  PluginContext,
  EmnapiPlugin,
  PluginFactory
} from './emnapi/index'

export type {
  LoadOptions,
  InstantiateOptions,
  LoadedSource,
  InstantiatedAddonSource,
  InstantiatedSource
} from './load'

export type {
  MessageHandlerOptions
} from './worker'

export type {
  InputType
} from './util'

export * from '@emnapi/wasi-threads'
