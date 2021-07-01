declare const __webpack_public_path__: any
declare const global: typeof globalThis

// eslint-disable-next-line @typescript-eslint/no-unused-vars
namespace emnapi {
  export const _global: typeof globalThis = (function () {
    let g
    g = (function (this: any) { return this })()

    try {
      // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval
      g = g || new Function('return this')()
    } catch (_) {
      if (typeof globalThis !== 'undefined') return globalThis
      if (typeof __webpack_public_path__ === 'undefined') {
        if (typeof global !== 'undefined') return global
      }
      if (typeof window !== 'undefined') return window
      if (typeof self !== 'undefined') return self
    }

    return g
  })()

  const dynamicCalls = emnapiGetDynamicCalls()

  export const call_iii = dynamicCalls.call_iii
  export const call_viii = dynamicCalls.call_viii
  export const call_malloc = dynamicCalls.call_malloc

  export const NULL: 0 = 0
  export const INT64_RANGE_POSITIVE = Math.pow(2, 63)
  export const INT64_RANGE_NEGATIVE = -Math.pow(2, 63)

  export class TryCatch {
    private _exception: any = undefined
    private _caught: boolean = false
    public hasCaught (): boolean {
      return this._caught
    }

    public exception (): any {
      return this._exception
    }

    public setError (err: any): void {
      this._exception = err
      this._caught = true
    }

    public reset (): void {
      this._exception = undefined
      this._caught = false
    }

    public extractException (): any {
      const e = this._exception
      this.reset()
      return e
    }
  }

  // eslint-disable-next-line prefer-const
  export let errorMessagesPtr: char_p[] | null = null
  // eslint-disable-next-line prefer-const
  export let nodeVersionPtr: Pointer<napi_node_version> = NULL

  class EnvStore extends Store<Env> {
    public constructor () {
      super()
    }
  }

  export const envStore = new EnvStore()

  /* export function gc (): void {
    envStore.forEach(envObject => {
      envObject.handleStore.forEach(h => {
        h.tryDispose()
      })
    })
    if (typeof (_global as any).gc === 'function') {
      (_global as any).gc()
    }
  } */

  export function napi_set_last_error (env: napi_env, error_code: napi_status, engine_error_code: uint32_t = 0, engine_reserved: void_p = 0): napi_status {
    const envObject = envStore.get(env)!
    envObject.napiExtendedErrorInfo.error_code = error_code
    envObject.napiExtendedErrorInfo.engine_error_code = engine_error_code
    envObject.napiExtendedErrorInfo.engine_reserved = engine_reserved

    const ptr32 = envObject.napiExtendedErrorInfoPtr >> 2
    HEAP32[ptr32 + 1] = envObject.napiExtendedErrorInfo.engine_reserved
    HEAPU32[ptr32 + 2] = envObject.napiExtendedErrorInfo.engine_error_code
    HEAP32[ptr32 + 3] = envObject.napiExtendedErrorInfo.error_code
    return error_code
  }

  export function napi_clear_last_error (env: napi_env): napi_status {
    const envObject = envStore.get(env)!
    envObject.napiExtendedErrorInfo.error_code = napi_status.napi_ok
    envObject.napiExtendedErrorInfo.engine_error_code = 0
    envObject.napiExtendedErrorInfo.engine_reserved = 0

    const ptr32 = envObject.napiExtendedErrorInfoPtr >> 2
    HEAP32[ptr32 + 1] = envObject.napiExtendedErrorInfo.engine_reserved
    HEAPU32[ptr32 + 2] = envObject.napiExtendedErrorInfo.engine_error_code
    HEAP32[ptr32 + 3] = envObject.napiExtendedErrorInfo.error_code
    return napi_status.napi_ok
  }

  export function checkEnv (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
    if ((env === NULL) || !envStore.has(env)) return napi_status.napi_invalid_arg
    const envObject = envStore.get(env)!
    return fn(envObject)
  }

  export function checkArgs (env: napi_env, args: any[], fn: () => napi_status): napi_status {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      if (arg === NULL) {
        return napi_set_last_error(env, napi_status.napi_invalid_arg)
      }
    }
    return fn()
  }

  export function preamble (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
    return checkEnv(env, (envObject) => {
      if (envObject.tryCatch.hasCaught()) return napi_set_last_error(env, napi_status.napi_pending_exception)
      napi_clear_last_error(env)
      try {
        return fn(envObject)
      } catch (err) {
        envObject.tryCatch.setError(err)
        return napi_set_last_error(env, napi_status.napi_pending_exception)
      }
    })
  }

  export function getReturnStatus (env: napi_env): napi_status {
    const envObject = envStore.get(env)!
    return !envObject.tryCatch.hasCaught() ? napi_status.napi_ok : napi_set_last_error(env, napi_status.napi_pending_exception)
  }

  export let canSetFunctionName = false
  try {
    canSetFunctionName = !!Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable
  } catch (_) {}

  export const supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined')
  export const supportBigInt = typeof BigInt !== 'undefined'

  export function free (ptr: void_p, size?: size_t): void {
    if (ptr === NULL) return
    if (typeof size === 'number' && size > 0) {
      try {
        HEAPU8.set(Array(size).fill(0), ptr)
      } catch (_) {}
    }
    _free(ptr)
  }
}
