import { Env } from './env'
import { Store } from './Store'

declare const __webpack_public_path__: any
declare const global: typeof globalThis

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
export let nodeVersionPtr: Pointer<napi_node_version> = NULL

export class EnvStore extends Store<Env> {
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

export function checkEnv (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
  if ((env === NULL) || !envStore.has(env)) return napi_status.napi_invalid_arg
  const envObject = envStore.get(env)!
  return fn(envObject)
}

export function checkArgs (envObject: Env, args: any[], fn: () => napi_status): napi_status {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === NULL) {
      return envObject.setLastError(napi_status.napi_invalid_arg)
    }
  }
  return fn()
}

export function preamble (env: napi_env, fn: (envObject: Env) => napi_status): napi_status {
  return checkEnv(env, (envObject) => {
    if (envObject.tryCatch.hasCaught()) return envObject.setLastError(napi_status.napi_pending_exception)
    envObject.clearLastError()
    try {
      return fn(envObject)
    } catch (err) {
      envObject.tryCatch.setError(err)
      return envObject.setLastError(napi_status.napi_pending_exception)
    }
  })
}

export let canSetFunctionName = false
try {
  canSetFunctionName = !!Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable
} catch (_) {}

export const supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined')
export const supportBigInt = typeof BigInt !== 'undefined'

export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array

export function isReferenceType (v: any): v is object {
  return (typeof v === 'object' && v !== null) || typeof v === 'function'
}
