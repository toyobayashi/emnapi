export { createNapiModule } from './module.js'
export {
  loadNapiModule,
  loadNapiModuleSync,
  instantiateNapiModule,
  instantiateNapiModuleSync
} from './load.js'

export { MessageHandler } from './worker.js'

export const version = __VERSION__
