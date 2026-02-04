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

export interface DylinkMetadata {
  neededDynlibs: string[]
  tlsExports: Set<string>
  weakImports: Set<string>
  runtimePaths: string[]
  memorySize: number
  memoryAlign: number
  tableSize: number
  tableAlign: number
}

export function getDylinkMetadata (binary: WebAssembly.Module | Uint8Array): DylinkMetadata {
  let offset = 0
  let end = 0
  const decoder = new TextDecoder()

  function getU8 () {
    return (binary as Uint8Array)[offset++]
  }

  function getLEB () {
    let ret = 0
    let mul = 1
    while (1) {
      let byte = (binary as Uint8Array)[offset++]
      ret += ((byte & 0x7f) * mul)
      mul *= 0x80
      if (!(byte & 0x80)) break
    }
    return ret
  }

  function getString () {
    let len = getLEB()
    offset += len
    return decoder.decode((binary as Uint8Array).subarray(offset - len, offset))
  }

  function getStringList () {
    let count = getLEB()
    let rtn = []
    while (count--) rtn.push(getString())
    return rtn
  }

  function failIf (condition: boolean, message?: string) {
    if (condition) throw new Error(message)
  }

  if (binary instanceof WebAssembly.Module) {
    const dylinkSection = WebAssembly.Module.customSections(binary, 'dylink.0')
    failIf(dylinkSection.length === 0, 'need dylink section')
    binary = new Uint8Array(dylinkSection[0])
    end = (binary as Uint8Array).length
  } else {
    var int32View = new Uint32Array(new Uint8Array(binary.subarray(0, 24)).buffer)
    var magicNumberFound = int32View[0] === 0x6d736100 || int32View[0] === 0x0061736d
    failIf(!magicNumberFound, 'need to see wasm magic number') // \0asm
    // we should see the dylink custom section right after the magic number and wasm version
    failIf(binary[8] !== 0, 'need the dylink section to be first')
    offset = 9
    var section_size = getLEB() // section size
    end = offset + section_size
    var name = getString()
    failIf(name !== 'dylink.0')
  }

  var customSection: DylinkMetadata = {
    neededDynlibs: [],
    tlsExports: new Set(),
    weakImports: new Set(),
    runtimePaths: [],
    memorySize: 0,
    memoryAlign: 0,
    tableSize: 0,
    tableAlign: 0
  }
  var WASM_DYLINK_MEM_INFO = 0x1
  var WASM_DYLINK_NEEDED = 0x2
  var WASM_DYLINK_EXPORT_INFO = 0x3
  var WASM_DYLINK_IMPORT_INFO = 0x4
  var WASM_DYLINK_RUNTIME_PATH = 0x5
  var WASM_SYMBOL_TLS = 0x100
  var WASM_SYMBOL_BINDING_MASK = 0x3
  var WASM_SYMBOL_BINDING_WEAK = 0x1
  while (offset < end) {
    var subsectionType = getU8()
    var subsectionSize = getLEB()
    if (subsectionType === WASM_DYLINK_MEM_INFO) {
      customSection.memorySize = getLEB()
      customSection.memoryAlign = getLEB()
      customSection.tableSize = getLEB()
      customSection.tableAlign = getLEB()
    } else if (subsectionType === WASM_DYLINK_NEEDED) {
      customSection.neededDynlibs = getStringList()
    } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
      let count = getLEB()
      while (count--) {
        let symname = getString()
        let flags = getLEB()
        if (flags & WASM_SYMBOL_TLS) {
          customSection.tlsExports.add(symname)
        }
      }
    } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
      let count = getLEB()
      while (count--) {
        /* var modname = */ getString()
        let symname = getString()
        let flags = getLEB()
        if ((flags & WASM_SYMBOL_BINDING_MASK) === WASM_SYMBOL_BINDING_WEAK) {
          customSection.weakImports.add(symname)
        }
      }
    } else if (subsectionType === WASM_DYLINK_RUNTIME_PATH) {
      customSection.runtimePaths = getStringList()
    } else {
      console.error('unknown dylink.0 subsection:', subsectionType)
      // unknown subsection
      offset += subsectionSize
    }
  }

  var tableAlign = Math.pow(2, customSection.tableAlign)
  failIf(tableAlign !== 1, `invalid tableAlign ${tableAlign}`)
  failIf(offset !== end)

  return customSection
}

// Versions defined in runtime
declare const __VERSION__: string
export const version = __VERSION__
export const NODE_API_SUPPORTED_VERSION_MIN = Version.NODE_API_SUPPORTED_VERSION_MIN
export const NODE_API_SUPPORTED_VERSION_MAX = Version.NODE_API_SUPPORTED_VERSION_MAX
export const NAPI_VERSION_EXPERIMENTAL = Version.NAPI_VERSION_EXPERIMENTAL
export const NODE_API_DEFAULT_MODULE_API_VERSION = Version.NODE_API_DEFAULT_MODULE_API_VERSION
export const NODE_MODULE_VERSION = Version.NODE_MODULE_VERSION
