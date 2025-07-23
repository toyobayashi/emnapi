declare const __webpack_public_path__: any
declare const __non_webpack_require__: ((id: string) => any) | undefined
declare const global: typeof globalThis

export function detectFinalizer () {
  return (typeof FinalizationRegistry !== 'undefined') && (typeof WeakRef !== 'undefined')
}

export const supportFinalizer = /*#__PURE__*/ detectFinalizer()

export interface Resolver<T> {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

export interface Features {
  makeDynamicFunction: ((...args: any[]) => Function) | undefined
  getGlobalThis: () => typeof globalThis
  setFunctionName: ((fn: Function, name: string) => void) | undefined
  Reflect: typeof Reflect | undefined
  finalizer: boolean
  weakSymbol: boolean
  BigInt: typeof BigInt | undefined
  MessageChannel: typeof MessageChannel | undefined
  Buffer: BufferCtor | undefined
  setImmediate: (callback: () => void) => any
  withResolvers: <T>(this: PromiseConstructor) => Resolver<T>
}

export function detectFeatures (features?: Partial<Features>): Features {
  const supportNewFunction = (function () {
    let f: Function
    try {
      f = new Function()
    } catch (_) {
      return false
    }
    return typeof f === 'function'
  })()

  const canSetFunctionName = (function () {
    try {
      return Boolean(Object.getOwnPropertyDescriptor(Function.prototype, 'name')?.configurable)
    } catch (_) {
      return false
    }
  })()

  const weakSymbol = (function () {
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

  const _require = (function () {
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

  function defaultGetGlobalThis (): typeof globalThis {
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

    throw new Error('Unable to get globalThis')
  }

  function defaultWithResolvers<T> (this: PromiseConstructor) {
    let ok: (value: T | PromiseLike<T>) => void
    let err: (reason?: any) => void
    const promise = new this<T>((resolve, reject) => {
      ok = resolve
      err = reject
    })
    return { promise, resolve: ok!, reject: err! }
  }

  const getGlobalThis = features && 'getGlobalThis' in features
    ? (features.getGlobalThis ?? defaultGetGlobalThis)
    : defaultGetGlobalThis

  const withResolvers = (features && 'withResolvers' in features)
    ? (features.withResolvers ?? defaultWithResolvers)
    : typeof Promise.withResolvers === 'function'
      ? Promise.withResolvers
      : defaultWithResolvers

  const getBuiltinModule: (id: string) => any = getGlobalThis?.().process?.getBuiltinModule ?? _require

  const ret: Features = {
    makeDynamicFunction: (supportNewFunction
      ? (...args: any[]) => (new Function(...args))
      : undefined),
    setFunctionName: (canSetFunctionName
      ? (f: Function, name: string) => { Object.defineProperty(f, 'name', { value: name }) }
      : undefined),
    Reflect: typeof Reflect === 'object' ? Reflect : undefined,
    finalizer: detectFinalizer(),
    weakSymbol,
    BigInt: typeof BigInt !== 'undefined' ? BigInt : undefined,
    MessageChannel: typeof MessageChannel === 'function'
      ? MessageChannel
      : (function () {
          try {
            return getBuiltinModule('worker_threads').MessageChannel
          } catch (_) {}

          return undefined
        })(),

    setImmediate: typeof setImmediate === 'function'
      ? setImmediate
      : function (callback: () => void): void {
        if (typeof callback !== 'function') {
          throw new TypeError('The "callback" argument must be of type function')
        }
        if (ret.MessageChannel) {
          let channel = new ret.MessageChannel()
          channel.port1.onmessage = function () {
            channel.port1.onmessage = null
            channel = undefined!
            callback()
          }
          channel.port2.postMessage(null)
        } else {
          setTimeout(callback, 0)
        }
      },
    Buffer: typeof Buffer === 'function'
      ? Buffer
      : (function () {
          try {
            return getBuiltinModule('buffer').Buffer
          } catch (_) {}

          return undefined
        })(),
    ...features,
    getGlobalThis,
    withResolvers
  }

  return ret
}

export function isReferenceType (v: any): v is object {
  return (typeof v === 'object' && v !== null) || typeof v === 'function'
}

// Versions defined in runtime
declare const __VERSION__: string
export const version = __VERSION__
export const NODE_API_SUPPORTED_VERSION_MIN = Version.NODE_API_SUPPORTED_VERSION_MIN
export const NODE_API_SUPPORTED_VERSION_MAX = Version.NODE_API_SUPPORTED_VERSION_MAX
export const NAPI_VERSION_EXPERIMENTAL = Version.NAPI_VERSION_EXPERIMENTAL
export const NODE_API_DEFAULT_MODULE_API_VERSION = Version.NODE_API_DEFAULT_MODULE_API_VERSION
export const NODE_MODULE_VERSION = Version.NODE_MODULE_VERSION
