/* eslint-disable no-unreachable */
/* eslint-disable no-new-func */
/* eslint-disable @typescript-eslint/no-implied-eval */

import { makeDynCall, to64 } from 'emscripten:parse-tools'
import { abort } from 'emscripten:runtime'

// declare const global: typeof globalThis
// declare const require: any
// declare const process: any
// declare const __webpack_public_path__: any

declare function _napi_register_wasm_v1 (env: Ptr, exports: Ptr): napi_value
declare function _node_api_module_get_api_version_v1 (): number

export interface InitOptions {
  context: Context
  filename?: string
  asyncWorkPoolSize?: number
  nodeBinding?: NodeBinding
}

export var emnapiCtx: Context = undefined!
export var emnapiNodeBinding: NodeBinding = undefined!
export var emnapiAsyncWorkPoolSize: number = 0

const emnapiModule: {
  exports: any
  loaded: boolean
  filename: string
  envObject?: Env
} = {
  exports: {},
  loaded: false,
  filename: ''
}

/**
 * @__deps napi_register_wasm_v1
 * @__deps node_api_module_get_api_version_v1
 */
export function emnapiInit (options: InitOptions): any {
  if (emnapiModule.loaded) return emnapiModule.exports

  if (typeof options !== 'object' || options === null) {
    throw new TypeError('Invalid emnapi init option')
  }

  const context = options.context
  if (typeof context !== 'object' || context === null) {
    throw new TypeError("Invalid `options.context`. Use `import { getDefaultContext } from '@emnapi/runtime'`")
  }

  emnapiCtx = context

  const filename = typeof options.filename === 'string' ? options.filename : ''
  emnapiModule.filename = filename

  if ('nodeBinding' in options) {
    const nodeBinding = options.nodeBinding
    if (typeof nodeBinding !== 'object' || nodeBinding === null) {
      throw new TypeError('Invalid `options.nodeBinding`. Use @emnapi/node-binding package')
    }
    emnapiNodeBinding = nodeBinding
  }

  if ('asyncWorkPoolSize' in options) {
    if (typeof options.asyncWorkPoolSize !== 'number') {
      throw new TypeError('options.asyncWorkPoolSize must be a integer')
    }
    emnapiAsyncWorkPoolSize = options.asyncWorkPoolSize >> 0
    if (emnapiAsyncWorkPoolSize > 1024) {
      emnapiAsyncWorkPoolSize = 1024
    } else if (emnapiAsyncWorkPoolSize < -1024) {
      emnapiAsyncWorkPoolSize = -1024
    }
  }

  const moduleApiVersion = _node_api_module_get_api_version_v1()

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const envObject = emnapiModule.envObject || (emnapiModule.envObject = emnapiCtx.createEnv(
    filename,
    moduleApiVersion,
    (cb: Ptr) => makeDynCall('vppp', 'cb'),
    (cb: Ptr) => makeDynCall('vp', 'cb'),
    abort,
    emnapiNodeBinding
  ))

  const scope = emnapiCtx.openScope(envObject)
  try {
    envObject.callIntoModule((_envObject) => {
      const exports = emnapiModule.exports
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const exportsHandle = scope.add(exports)
      const napiValue = _napi_register_wasm_v1(to64('_envObject.id'), to64('exportsHandle.id'))
      emnapiModule.exports = (!napiValue) ? exports : emnapiCtx.handleStore.get(napiValue)!.value
    })
  } catch (err) {
    if (err !== 'unwind') {
      throw err
    }
  } finally {
    emnapiCtx.closeScope(envObject, scope)
  }
  emnapiModule.loaded = true
  delete emnapiModule.envObject
  return emnapiModule.exports
}

export { emnapiInit as $emnapiInit }

/**
 * @__sig i
 */
export function _emnapi_async_work_pool_size (): number {
  return Math.abs(emnapiAsyncWorkPoolSize)
}
