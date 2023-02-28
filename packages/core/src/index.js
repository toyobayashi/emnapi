export { createNapiModule } from './module.js'
export {
  loadNapiModule,
  loadNapiModuleSync,
  instantiateNapiModule,
  instantiateNapiModuleSync
} from './load.js'

export { handleMessage } from './worker.js'

export const version = __VERSION__
