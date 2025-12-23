import * as initMod from './init'

import * as asyncMod from './async'
import * as memoryMod from './memory'

import { emnapiExternalMemory } from '../memory'
import { emnapiString } from '../string'

import * as utilMod from '../util'
import * as convert2cMod from '../value/convert2c'
import * as convert2napiMod from '../value/convert2napi'
import * as createMod from '../value/create'
import * as globalMod from '../value/global'
import * as wrapMod from '../wrap'
import * as envMod from '../env'
import * as emnapiMod from '../emnapi'
import * as errorMod from '../error'
import * as functionMod from '../function'
import * as lifeMod from '../life'
import * as miscellaneousMod from '../miscellaneous'
import * as nodeMod from '../node'
import * as promiseMod from '../promise'
import * as propertyMod from '../property'
import * as scriptMod from '../script'
// import {
//   emnapiTSFN,
//   napi_create_threadsafe_function,
//   napi_get_threadsafe_function_context,
//   napi_call_threadsafe_function,
//   napi_acquire_threadsafe_function,
//   napi_release_threadsafe_function,
//   napi_unref_threadsafe_function,
//   napi_ref_threadsafe_function
// } from '../threadsafe-function'
import * as valueOperationMod from '../value-operation'
import * as versionMod from '../version'

emnapiExternalMemory.init()
emnapiString.init()
// emnapiTSFN.init()
initMod.PThread.init()

initMod.napiModule.emnapi.syncMemory = emnapiMod.$emnapiSyncMemory
initMod.napiModule.emnapi.getMemoryAddress = emnapiMod.$emnapiGetMemoryAddress

function addImports (mod: any): void {
  const keys = Object.keys(mod)
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]
    if (k.indexOf('$') === 0) continue

    if (k.indexOf('emnapi_') === 0) {
      initMod.napiModule.imports.emnapi[k] = mod[k]
    } else if (k.indexOf('_emnapi_') === 0 || k.indexOf('_v8_') === 0 || k === 'napi_set_last_error' || k === 'napi_clear_last_error') {
      initMod.napiModule.imports.env[k] = mod[k]
    } else {
      initMod.napiModule.imports.napi[k] = mod[k]
    }
  }
}

addImports(asyncMod)
addImports(memoryMod)

addImports(utilMod)
addImports(convert2cMod)
addImports(convert2napiMod)
addImports(createMod)
addImports(globalMod)
addImports(wrapMod)
addImports(envMod)
addImports(emnapiMod)
addImports(errorMod)
addImports(functionMod)
addImports(lifeMod)
addImports(miscellaneousMod)
addImports(nodeMod)
addImports(promiseMod)
addImports(propertyMod)
addImports(scriptMod)
addImports(valueOperationMod)
addImports(versionMod)

// napiModule.imports.napi.napi_create_threadsafe_function = napi_create_threadsafe_function
// napiModule.imports.napi.napi_get_threadsafe_function_context = napi_get_threadsafe_function_context
// napiModule.imports.napi.napi_call_threadsafe_function = napi_call_threadsafe_function
// napiModule.imports.napi.napi_acquire_threadsafe_function = napi_acquire_threadsafe_function
// napiModule.imports.napi.napi_release_threadsafe_function = napi_release_threadsafe_function
// napiModule.imports.napi.napi_unref_threadsafe_function = napi_unref_threadsafe_function
// napiModule.imports.napi.napi_ref_threadsafe_function = napi_ref_threadsafe_function

const pluginCtx: any = {
  emnapiString
}
Object.keys(initMod).forEach(k => {
  Object.defineProperty(pluginCtx, k, {
    get: () => (initMod as any)[k],
    enumerable: true,
    configurable: true
  })
})
Object.keys(nodeMod).forEach(k => {
  Object.defineProperty(pluginCtx, k, {
    get: () => (nodeMod as any)[k],
    enumerable: true,
    configurable: true
  })
})
Object.keys(utilMod).forEach(k => {
  Object.defineProperty(pluginCtx, k, {
    get: () => (utilMod as any)[k],
    enumerable: true,
    configurable: true
  })
})

initMod.napiModule.plugins = (options.plugins ?? []).map((plugin) => {
  if (typeof plugin === 'function') {
    return plugin(pluginCtx)
  }
  if (typeof plugin === 'object' && plugin !== null) {
    return plugin
  }
  throw new TypeError('Invalid plugin')
})

initMod.napiModule.plugins.forEach((plugin) => {
  if (typeof plugin.importObject === 'function') {
    const importObject = plugin.importObject(initMod.napiModule.imports)
    if (importObject) {
      initMod.napiModule.imports = importObject as typeof initMod.napiModule.imports
    }
  }
})

export default initMod.napiModule
