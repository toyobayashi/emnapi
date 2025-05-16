import { napiModule, PThread, emnapiCtx } from 'emnapi:shared'
import { wasmMemory, wasmTable } from 'emscripten:runtime'

import * as asyncMod from './async'
import * as memoryMod from './memory'
import * as asyncWorkMod from './async-work'

import { emnapiAWST } from '../async-work'
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
import {
  emnapiTSFN,
  napi_create_threadsafe_function,
  napi_get_threadsafe_function_context,
  napi_call_threadsafe_function,
  napi_acquire_threadsafe_function,
  napi_release_threadsafe_function,
  napi_unref_threadsafe_function,
  napi_ref_threadsafe_function
} from '../threadsafe-function'
import * as valueOperationMod from '../value-operation'
import * as versionMod from '../version'

emnapiAWST.init()
emnapiExternalMemory.init()
emnapiString.init()
emnapiTSFN.init()
PThread.init()

napiModule.emnapi.syncMemory = emnapiMod.$emnapiSyncMemory
napiModule.emnapi.getMemoryAddress = emnapiMod.$emnapiGetMemoryAddress

function addImports (mod: any): void {
  const keys = Object.keys(mod)
  for (let i = 0; i < keys.length; ++i) {
    const k = keys[i]
    if (k.indexOf('$') === 0) continue

    if (k.indexOf('emnapi_') === 0) {
      napiModule.imports.emnapi[k] = mod[k]
    } else if (k.indexOf('_emnapi_') === 0 || k.indexOf('_v8_') === 0 || k === 'napi_set_last_error' || k === 'napi_clear_last_error') {
      napiModule.imports.env[k] = mod[k]
    } else {
      napiModule.imports.napi[k] = mod[k]
    }
  }
}

addImports(asyncMod)
addImports(memoryMod)
addImports(asyncWorkMod)

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

napiModule.imports.napi.napi_create_threadsafe_function = napi_create_threadsafe_function
napiModule.imports.napi.napi_get_threadsafe_function_context = napi_get_threadsafe_function_context
napiModule.imports.napi.napi_call_threadsafe_function = napi_call_threadsafe_function
napiModule.imports.napi.napi_acquire_threadsafe_function = napi_acquire_threadsafe_function
napiModule.imports.napi.napi_release_threadsafe_function = napi_release_threadsafe_function
napiModule.imports.napi.napi_unref_threadsafe_function = napi_unref_threadsafe_function
napiModule.imports.napi.napi_ref_threadsafe_function = napi_ref_threadsafe_function

const pluginCtx = {
  wasmMemory: () => wasmMemory,
  wasmTable: () => wasmTable,
  emnapiCtx,
  emnapiString
}

napiModule.plugins = (options.plugins ?? []).map((plugin) => {
  if (typeof plugin === 'function') {
    return plugin(pluginCtx)
  }
  if (typeof plugin === 'object' && plugin !== null) {
    return plugin
  }
  throw new TypeError('Invalid plugin')
})

napiModule.plugins.forEach((plugin) => {
  if (typeof plugin.importObject === 'function') {
    const importObject = plugin.importObject(napiModule.imports)
    if (importObject) {
      napiModule.imports = importObject as typeof napiModule.imports
    }
  }
})

export default napiModule
