declare const __webpack_public_path__: any
declare const __non_webpack_require__: ((id: string) => any) | undefined
declare const global: typeof globalThis

export const supportNewFunction = /*#__PURE__*/ (function () {
  let f: Function
  try {
    f = new Function()
  } catch (_) {
    return false
  }
  return typeof f === 'function'
})()

export const _global: typeof globalThis = /*#__PURE__*/ (function () {
  if (typeof globalThis !== 'undefined') return globalThis

  let g = (function (this: any) { return this })()
  if (!g && supportNewFunction) {
    try {
      g = new Function('return this')()
    } catch (_) {}
  }

  if (!g) {
    if (typeof __webpack_public_path__ === 'undefined') {
      if (typeof global !== 'undefined') return global
    }
    if (typeof window !== 'undefined') return window
    if (typeof self !== 'undefined') return self
  }

  return g
})()

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
    this._caught = true
    this._exception = err
  }

  public reset (): void {
    this._caught = false
    this._exception = undefined
  }

  public extractException (): any {
    const e = this._exception
    this.reset()
    return e
  }
}

export const canSetFunctionName = /*#__PURE__*/ (function () {
  try {
    return Boolean(Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable)
  } catch (_) {
    return false
  }
})()

export const supportReflect = typeof Reflect === 'object'
export const supportFinalizer = (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined')
export const supportWeakSymbol = /*#__PURE__*/ (function () {
  try {
    // eslint-disable-next-line symbol-description
    const sym = Symbol()
    // eslint-disable-next-line no-new
    new WeakRef(sym as any)
    new WeakMap().set(sym as any, undefined)
  } catch (_) {
    return false
  }
  return true
})()
export const supportBigInt = typeof BigInt !== 'undefined'

export function isReferenceType (v: any): v is object {
  return (typeof v === 'object' && v !== null) || typeof v === 'function'
}

const _require = /*#__PURE__*/ (function () {
  let nativeRequire

  if (typeof __webpack_public_path__ !== 'undefined') {
    nativeRequire = (function () {
      return typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined
    })()
  } else {
    nativeRequire = (function () {
      return typeof __webpack_public_path__ !== 'undefined' ? (typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined) : (typeof require !== 'undefined' ? require : undefined)
    })()
  }

  return nativeRequire
})()

export const _MessageChannel: typeof MessageChannel | undefined = typeof MessageChannel === 'function'
  ? MessageChannel
  : /*#__PURE__*/ (function () {
      try {
        return _require!('worker_threads').MessageChannel
      } catch (_) {}

      return undefined
    })()

export const _setImmediate = typeof setImmediate === 'function'
  ? setImmediate
  : function (callback: () => void): void {
    if (typeof callback !== 'function') {
      throw new TypeError('The "callback" argument must be of type function')
    }
    if (_MessageChannel) {
      let channel = new _MessageChannel()
      channel.port1.onmessage = function () {
        channel.port1.onmessage = null
        channel = undefined!
        callback()
      }
      channel.port2.postMessage(null)
    } else {
      setTimeout(callback, 0)
    }
  }

export const _Buffer: BufferCtor | undefined = typeof Buffer === 'function'
  ? Buffer
  : /*#__PURE__*/ (function () {
      try {
        return _require!('buffer').Buffer
      } catch (_) {}

      return undefined
    })()

// Versions defined in runtime
declare const __VERSION__: string
export const version = __VERSION__
export const NODE_API_MODULE_API_VERSION = Version.NODE_API_MODULE_API_VERSION
export const NAPI_VERSION_EXPERIMENTAL = Version.NAPI_VERSION_EXPERIMENTAL
export const NODE_API_DEFAULT_MODULE_API_VERSION = Version.NODE_API_DEFAULT_MODULE_API_VERSION
